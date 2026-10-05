import { describe, expect, it } from "vitest";
import { products } from "@/config/merchandiseConfig";
import { categorySlug } from "@/lib/merchSlug";
import {
  getCategoryCatalog,
  getRecentLookup,
  getRelatedProducts,
  getStorefrontCategories,
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
