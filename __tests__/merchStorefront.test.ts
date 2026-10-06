import { describe, expect, it } from "vitest";
import { products } from "@/config/merchandiseConfig";
import { categorySlug } from "@/lib/merchSlug";
import { blockKey, summarizeCardTypes } from "@/lib/merchCatalog";
import {
  getCategoryCards,
  getCategoryCatalog,
  getRecentLookup,
  getRelatedProducts,
  getStorefrontCategories,
  getStorefrontInitialCatalog,
} from "@/lib/merchStorefront";

describe("getCategoryCatalog", () => {
  it("returns exactly that category's products for each real slug", () => {
    for (const category of getStorefrontCategories()) {
      const catalog = getCategoryCatalog(categorySlug(category))!;
      expect(catalog.category).toBe(category);
      expect(catalog.products.length).toBe(products.filter((p) => p.category === category).length);
      expect(catalog.products.every((p) => p.category === category)).toBe(true);
    }
  });

  it("returns undefined for an unknown slug", () => {
    expect(getCategoryCatalog("not-a-category")).toBeUndefined();
    expect(getCategoryCatalog("")).toBeUndefined();
  });
});

describe("getRelatedProducts", () => {
  it("returns up to four other same-category products, deterministically", () => {
    const sample = products.filter((p) => p.category === "Apparel").slice(0, 5);
    for (const product of sample) {
      const related = getRelatedProducts(product.id);
      expect(related.length).toBeGreaterThan(0);
      expect(related.length).toBeLessThanOrEqual(4);
      expect(related.every((r) => r.category === product.category && r.id !== product.id)).toBe(
        true
      );
      expect(getRelatedProducts(product.id).map((r) => r.id)).toEqual(related.map((r) => r.id));
    }
  });

  it("is slim: no supplier-side fields", () => {
    const text = JSON.stringify(getRelatedProducts(products[0].id));
    expect(text).not.toMatch(/espPrice|espUrl|espId|supplier|espplus/i);
  });

  it("returns nothing for an unknown id", () => {
    expect(getRelatedProducts("nope")).toEqual([]);
  });
});

describe("getRecentLookup", () => {
  const lookup = getRecentLookup();

  it("covers every product with only id, name, image and starting price", () => {
    expect(Object.keys(lookup)).toHaveLength(products.length);
    for (const product of products) {
      const entry = lookup[product.id];
      expect(entry.name).toBe(product.name);
      expect(entry.startingPrice).toBe(product.priceTiers[0].price);
      expect(
        Object.keys(entry).every((k) => ["id", "name", "image", "startingPrice"].includes(k))
      ).toBe(true);
    }
    expect(JSON.stringify(lookup)).not.toMatch(/espPrice|espUrl|espId|supplier|espplus/i);
  });
});

describe("product types in the storefront data", () => {
  it("every card carries its type, and the category list is in type then brand-block order", () => {
    for (const category of getStorefrontCategories()) {
      const { cards, types } = getCategoryCards(categorySlug(category))!;
      expect(cards.every((card) => typeof card.type === "string" && card.type !== "")).toBe(true);
      // the summary lists the types in the order the cards come in, and counts them all
      expect(summarizeCardTypes(cards).map((t) => t.label)).toEqual(types.map((t) => t.label));
      expect(types.reduce((sum, t) => sum + t.count, 0)).toBe(cards.length);
      for (const entry of types) {
        const ofType = cards.filter((card) => card.type === entry.label);
        expect(ofType).toHaveLength(entry.count);
        expect(new Set(ofType.map((card) => card.brand)).size).toBe(entry.blocks);
      }
    }
  });

  it("the hub's first cards are the first cards of each category's own list", () => {
    const initial = getStorefrontInitialCatalog();
    for (const category of initial.categories) {
      const first = initial.products.filter((p) => p.category === category);
      const { cards } = getCategoryCards(categorySlug(category))!;
      expect(first.map((p) => p.id)).toEqual(cards.slice(0, first.length).map((p) => p.id));
      expect(initial.types[category].reduce((sum, t) => sum + t.count, 0)).toBe(cards.length);
    }
  });

  it("sends the full size of every brand block that shows among the first cards", () => {
    const initial = getStorefrontInitialCatalog();
    for (const category of initial.categories) {
      const { cards } = getCategoryCards(categorySlug(category))!;
      for (const card of initial.products.filter((p) => p.category === category)) {
        const expected = cards.filter((c) => c.type === card.type && c.brand === card.brand).length;
        expect(initial.blockTotals[blockKey(category, card.type!, card.brand)]).toBe(expected);
      }
    }
  });

  it("keeps cost and supplier data out of the type data", () => {
    const text = JSON.stringify(getStorefrontInitialCatalog().types);
    expect(text).not.toMatch(/espPrice|espUrl|espId|supplier|espplus/i);
  });

  it("related products come from the same category and favour the same type", () => {
    const polo = products.find((p) => p.category === "Apparel" && /Polo/.test(p.name))!;
    const related = getRelatedProducts(polo.id);
    expect(related.some((r) => r.type === "Polos")).toBe(true);
  });
});
