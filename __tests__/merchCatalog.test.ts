import { describe, expect, it } from "vitest";
import {
  bestTier,
  growVisible,
  isRealBrand,
  matchesQuery,
  nextBatchSize,
  nextTier,
  searchHaystack,
  sortProducts,
  startingTier,
  tierForQuantity,
  toCatalogProduct,
  type CatalogProduct,
} from "@/lib/merchCatalog";

const AREA = { top: 40, left: 50, width: 20 };

function product(overrides: Partial<CatalogProduct> & { id: string }): CatalogProduct {
  return {
    name: overrides.id,
    category: "Apparel",
    brand: "Essentials",
    description: "",
    tiers: [{ quantity: 50, price: 10 }],
    imprintArea: AREA,
    ...overrides,
  };
}

describe("toCatalogProduct", () => {
  const source = {
    id: "mug",
    name: "Mug",
    category: "Drinkware",
    brand: "Essentials",
    description: "x".repeat(400),
    image: "/images/merch/mug.jpg",
    colors: ["Black", "Black", "Navy Blue Show less"],
    colorImages: { "Navy Blue Show less": "/images/merch/mug-navy.jpg" },
    priceTiers: [
      { quantity: 250, price: 2.1, espPrice: 2.0, supplierCost: 1.0 },
      { quantity: 50, price: 3.15, espPrice: 3.0, supplierCost: 1.5 },
    ],
    supplier: "Secret Supplier Inc.",
  };

  it("never carries ESP, cost or supplier fields to the browser", () => {
    const slim = toCatalogProduct(source, AREA);
    const serialized = JSON.stringify(slim);
    expect(serialized).not.toMatch(/espPrice|supplierCost|supplier|Secret/);
    expect(slim.tiers).toEqual([
      { quantity: 50, price: 3.15 },
      { quantity: 250, price: 2.1 },
    ]);
  });

  it("cleans and de-duplicates colors, keeping colorImages keys in step", () => {
    const slim = toCatalogProduct(source, AREA);
    expect(slim.colors).toEqual(["Black", "Navy Blue"]);
    expect(slim.colorImages).toEqual({ "Navy Blue": "/images/merch/mug-navy.jpg" });
  });

  it("truncates descriptions only on request", () => {
    expect(toCatalogProduct(source, AREA).description).toHaveLength(400);
    const card = toCatalogProduct(source, AREA, { truncateDescription: true });
    expect(card.description.length).toBeLessThan(230);
    expect(card.description.endsWith("…")).toBe(true);
  });
});

describe("tiers", () => {
  const p = product({
    id: "p",
    tiers: [
      { quantity: 25, price: 5 },
      { quantity: 100, price: 4 },
      { quantity: 500, price: 3 },
    ],
  });

  it("finds starting and best tiers", () => {
    expect(startingTier(p).price).toBe(5);
    expect(bestTier(p).price).toBe(3);
  });

  it("picks the best tier a quantity qualifies for", () => {
    expect(tierForQuantity(p, 1).price).toBe(5);
    expect(tierForQuantity(p, 100).price).toBe(4);
    expect(tierForQuantity(p, 499).price).toBe(4);
    expect(tierForQuantity(p, 5000).price).toBe(3);
  });

  it("finds the next tier up", () => {
    expect(nextTier(p, 30)?.quantity).toBe(100);
    expect(nextTier(p, 500)).toBeUndefined();
  });
});

describe("isRealBrand", () => {
  it("hides the private-label 'Essentials' brand", () => {
    expect(isRealBrand("Essentials")).toBe(false);
    expect(isRealBrand("essentials")).toBe(false);
    expect(isRealBrand("")).toBe(false);
    expect(isRealBrand("Peter Millar")).toBe(true);
  });
});

describe("sortProducts", () => {
  const list = [
    product({ id: "a", name: "Zeta Mug", tiers: [{ quantity: 1, price: 9 }] }),
    product({ id: "b", name: "alpha Pen", tiers: [{ quantity: 1, price: 2 }] }),
    product({ id: "c", name: "Mid Bag", tiers: [{ quantity: 1, price: 2 }] }),
  ];

  it("featured keeps server order", () => {
    expect(sortProducts(list, "featured").map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts by price, breaking ties by featured order", () => {
    expect(sortProducts(list, "price-asc").map((p) => p.id)).toEqual(["b", "c", "a"]);
    expect(sortProducts(list, "price-desc").map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts by name case-insensitively without mutating the input", () => {
    expect(sortProducts(list, "name").map((p) => p.id)).toEqual(["b", "c", "a"]);
    expect(list.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

describe("search", () => {
  const p = product({
    id: "tee",
    name: "Cotton Tee",
    brand: "Gildan",
    colors: ["Navy Blue", "Forest Green"],
  });

  it("matches name, brand and color terms together (AND)", () => {
    const hay = searchHaystack(p);
    expect(matchesQuery(hay, "gildan navy")).toBe(true);
    expect(matchesQuery(hay, "cotton FOREST")).toBe(true);
    expect(matchesQuery(hay, "cotton red")).toBe(false);
    expect(matchesQuery(hay, "   ")).toBe(true);
  });
});

describe("progressive disclosure math", () => {
  it("grows by a step but never past the total", () => {
    expect(growVisible(8, 71)).toBe(32);
    expect(growVisible(32, 40)).toBe(40);
  });

  it("reports how many items the next click reveals", () => {
    expect(nextBatchSize(8, 71)).toBe(24);
    expect(nextBatchSize(32, 40)).toBe(8);
    expect(nextBatchSize(40, 40)).toBe(0);
  });
});
