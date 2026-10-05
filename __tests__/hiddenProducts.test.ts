import { describe, expect, it } from "vitest";
import hiddenProducts from "@/config/hiddenProducts.json";
import { getProductById, products } from "@/config/merchandiseConfig";

describe("hidden products", () => {
  it("are absent from the storefront catalog and cannot be fetched by id", () => {
    for (const id of Object.keys(hiddenProducts)) {
      expect(
        products.some((p) => p.id === id),
        id
      ).toBe(false);
      expect(getProductById(id), id).toBeUndefined();
    }
  });

  it("each carries a written reason", () => {
    for (const [id, reason] of Object.entries(hiddenProducts as Record<string, string>)) {
      expect(reason.trim().length, id).toBeGreaterThan(10);
    }
  });
});
