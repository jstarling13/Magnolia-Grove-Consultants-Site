import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  bestTier,
  growVisible,
  isRealBrand,
  matchesQuery,
  nextBatchSize,
  nextTier,
  searchHaystack,
  searchProducts,
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

  it("matches words that start with the term, not text inside a word", () => {
    const colored = product({
      id: "c",
      name: "Colored Tailored Powered Jacket",
      description: "Shredded and hundred-percent restored.",
    });
    const hay = searchHaystack(colored);
    expect(matchesQuery(hay, "red")).toBe(false);
    expect(matchesQuery(hay, "color")).toBe(true);
    expect(matchesQuery(hay, "tailor")).toBe(true);
    expect(matchesQuery(hay, "colored jac")).toBe(true);
    expect(
      matchesQuery(searchHaystack(product({ id: "r", colors: ["Red", "Dark Red"] })), "red")
    ).toBe(true);
  });

  it("ignores punctuation and case so t-shirt, T Shirt and 20oz-style terms still work", () => {
    const hay = searchHaystack(product({ id: "t", name: "Men's Short-Sleeve T-Shirt 3.4 oz" }));
    expect(matchesQuery(hay, "t-shirt")).toBe(true);
    expect(matchesQuery(hay, "T SHIRT")).toBe(true);
    expect(matchesQuery(hay, "short sleeve")).toBe(true);
    expect(matchesQuery(hay, "men's")).toBe(true);
    expect(matchesQuery(hay, "3.4")).toBe(true);
    expect(matchesQuery(hay, "&")).toBe(true);
  });

  it("finds accented words with plain prefixes", () => {
    expect(matchesQuery(searchHaystack(product({ id: "e", name: "Café Mug" })), "caf")).toBe(true);
  });
});

describe("searchProducts", () => {
  const hay = (p: CatalogProduct) => searchHaystack(p);
  const ids = (list: CatalogProduct[]) => list.map((p) => p.id);

  it("drops 'colored/tailored/powered' for the query 'red' and keeps real red items", () => {
    const list = [
      product({ id: "colored", name: "Colored Pencils", description: "Tailored and powered." }),
      product({ id: "mug", name: "Mug", colors: ["Red", "Blue"] }),
      product({ id: "tee", name: "Red Tee" }),
    ];
    expect(ids(searchProducts(list, "red", hay))).toEqual(["tee", "mug"]);
  });

  it("ranks name above brand above category above color above description", () => {
    const list = [
      product({ id: "desc", name: "Aaa", description: "Great for any pine event." }),
      product({ id: "color", name: "Bbb", colors: ["Pine"] }),
      product({ id: "category", name: "Ccc", category: "Pine Goods" }),
      product({ id: "brand", name: "Ddd", brand: "Pine" }),
      product({ id: "name", name: "Eee Pine" }),
    ];
    expect(ids(searchProducts(list, "pine", hay))).toEqual([
      "name",
      "brand",
      "category",
      "color",
      "desc",
    ]);
  });

  it("ranks a whole word above a longer word that merely starts with the term", () => {
    const list = [
      product({ id: "prefix", name: "Redwood Planter" }),
      product({ id: "whole", name: "Red Planter" }),
    ];
    expect(ids(searchProducts(list, "red", hay))).toEqual(["whole", "prefix"]);
  });

  it("lets a better field beat a better match kind (name prefix over description whole word)", () => {
    const list = [
      product({ id: "desc-whole", name: "Zzz", description: "Comes in red." }),
      product({ id: "name-prefix", name: "Redwood Chair" }),
    ];
    expect(ids(searchProducts(list, "red", hay))).toEqual(["name-prefix", "desc-whole"]);
  });

  it("keeps the input order among equal matches", () => {
    const list = [product({ id: "b", name: "Red B" }), product({ id: "a", name: "Red A" })];
    expect(ids(searchProducts(list, "red", hay))).toEqual(["b", "a"]);
  });

  it("requires every term (AND), summing their ranks", () => {
    const list = [
      product({ id: "navy-tee", name: "Tee", colors: ["Navy"] }),
      product({ id: "navy-mug", name: "Mug", colors: ["Navy"] }),
      product({ id: "tee-navy-name", name: "Navy Tee" }),
    ];
    expect(ids(searchProducts(list, "navy tee", hay))).toEqual(["tee-navy-name", "navy-tee"]);
  });

  it("falls back to substring matches only when no product has a word match", () => {
    const list = [
      product({ id: "one-word", name: "Gildan TShirt" }),
      product({ id: "other", name: "Mug" }),
    ];
    // "shirt" starts no word anywhere, so the substring fallback finds the one-word "TShirt".
    expect(ids(searchProducts(list, "shirt", hay))).toEqual(["one-word"]);
    // Once one product has a real word match, substring-only products are left out.
    const withWord = [...list, product({ id: "real", name: "Dress Shirt" })];
    expect(ids(searchProducts(withWord, "shirt", hay))).toEqual(["real"]);
  });

  it("returns every item for an empty query and nothing for a miss, without mutating input", () => {
    const list = [product({ id: "a" }), product({ id: "b" })];
    expect(ids(searchProducts(list, "  ", hay))).toEqual(["a", "b"]);
    expect(searchProducts(list, "zzzz", hay)).toEqual([]);
    expect(ids(list)).toEqual(["a", "b"]);
  });

  it("does not match across the field boundary", () => {
    const list = [product({ id: "x", name: "Mug", brand: "Acme", category: "Drinkware" })];
    expect(searchProducts(list, "mug acme drinkware", hay)).toHaveLength(1);
    // "mugacme" would only exist if the name and brand text ran together.
    expect(searchProducts(list, "mugacme", hay)).toEqual([]);
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

describe("client bundle hygiene", () => {
  it("keeps the full catalog config (and its ESP price tiers) out of client components", () => {
    const dir = path.resolve(__dirname, "../src/components/merchandise");
    const offenders = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".tsx"))
      .filter((file) => {
        const source = fs.readFileSync(path.join(dir, file), "utf8");
        return source.includes('"use client"') && /config\/merchandiseConfig/.test(source);
      });
    expect(offenders).toEqual([]);
  });
});
