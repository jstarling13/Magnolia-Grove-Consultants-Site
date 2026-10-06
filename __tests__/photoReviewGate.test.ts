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

import colorsShownInPhoto from "@/config/colorsShownInPhoto.json";
import { toCatalogProduct } from "@/lib/merchCatalog";

describe("colors shown in the main photo", () => {
  it("lists only ids that exist and flags them on the product", () => {
    const byId = new Map(allProducts.map((p) => [p.id, p]));
    for (const id of colorsShownInPhoto as string[]) {
      expect(byId.has(id), id).toBe(true);
      expect(byId.get(id)?.allColorsInPhoto, id).toBe(true);
    }
  });

  it("reaches the catalog product so the gallery can skip the missing-photo note", () => {
    const id = (colorsShownInPhoto as string[])[0];
    const product = allProducts.find((p) => p.id === id)!;
    expect(toCatalogProduct(product, { top: 50, left: 50, width: 30 }).allColorsInPhoto).toBe(true);
  });
});
