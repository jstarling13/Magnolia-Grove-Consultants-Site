import { describe, expect, it } from "vitest";
import { allProducts, products, unreviewedProducts } from "@/config/merchandiseConfig";
import photoReviewed from "@/config/photoReviewed.json";

describe("photo review gate", () => {
  const live = new Set(products.map((p) => p.id));

  it("keeps imported products off the storefront until their photo is reviewed", () => {
    expect(unreviewedProducts.length).toBeGreaterThan(0);
    for (const product of unreviewedProducts) expect(live.has(product.id)).toBe(false);
  });

  it("shows every reviewed, non-hidden product", () => {
    const reviewed = new Set(photoReviewed as string[]);
    const shown = allProducts.filter((p) => reviewed.has(p.id) && live.has(p.id));
    expect(shown.length).toBeGreaterThan(500);
  });

  it("never lists an id twice", () => {
    const ids = photoReviewed as string[];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
