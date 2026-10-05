import { describe, expect, it } from "vitest";
import { products } from "@/config/merchandiseConfig";
import { getCartCatalog } from "@/lib/merchStorefront";

describe("getCartCatalog (props shipped to the cart page)", () => {
  const catalog = getCartCatalog();

  it("carries the colors and per-color photos the cart needs", () => {
    const withPhotos = products.find((p) => Object.keys(p.colorImages ?? {}).length > 0)!;
    const entry = catalog.find((p) => p.id === withPhotos.id)!;
    expect(entry.colors?.length).toBeGreaterThan(1);
    expect(Object.keys(entry.colorImages ?? {}).length).toBeGreaterThan(0);
    // Every photo key is one of the product's own (cleaned) colors.
    for (const color of Object.keys(entry.colorImages!)) expect(entry.colors).toContain(color);
  });

  it("stays slim: no descriptions and no supplier-side price or link fields", () => {
    for (const entry of catalog) {
      expect(entry.description).toBe("");
      for (const tier of entry.tiers) expect(Object.keys(tier).sort()).toEqual(["price", "quantity"]);
    }
    expect(JSON.stringify(catalog)).not.toMatch(/espPrice|espUrl|espId|supplier|espplus/i);
  });

  it("covers every product so any saved cart line can be rendered", () => {
    expect(catalog.map((p) => p.id)).toEqual(products.map((p) => p.id));
  });
});
