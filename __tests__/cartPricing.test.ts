import { describe, expect, it } from "vitest";
import {
  cartLineKey,
  minimumOrderQuantity,
  priceCart,
  resolveLineColor,
  validateCart,
  type CartPricingProduct,
} from "@/lib/cartPricing";

const vest: CartPricingProduct = {
  id: "vest",
  name: "Test Vest",
  colors: ["Black", "Navy Show less", "Iron"],
  tiers: [
    { quantity: 6, price: 100 },
    { quantity: 12, price: 90 },
    { quantity: 24, price: 80 },
  ],
};
const mug: CartPricingProduct = {
  id: "mug",
  name: "Test Mug",
  tiers: [
    { quantity: 1, price: 5 },
    { quantity: 50, price: 4 },
  ],
};
const lookup = (id: string) => [vest, mug].find((product) => product.id === id);

describe("minimumOrderQuantity", () => {
  it("is the smallest quantity in the price tiers, whatever their order", () => {
    expect(minimumOrderQuantity(vest)).toBe(6);
    expect(minimumOrderQuantity({ tiers: [{ quantity: 24, price: 1 }, { quantity: 6, price: 2 }] })).toBe(6);
    expect(minimumOrderQuantity(mug)).toBe(1);
  });
});

describe("resolveLineColor", () => {
  it("accepts only exact colors the product offers (after cleaning supplier debris)", () => {
    expect(resolveLineColor(vest, "Navy")).toEqual({ kind: "ok", color: "Navy" });
    expect(resolveLineColor(vest, "navy")).toEqual({ kind: "invalid", color: "navy" });
    expect(resolveLineColor(vest, "Purple")).toEqual({ kind: "invalid", color: "Purple" });
  });

  it("reports a missing color on a colored product and none on an uncolored one", () => {
    expect(resolveLineColor(vest, undefined)).toEqual({ kind: "missing" });
    expect(resolveLineColor(vest, "  ")).toEqual({ kind: "missing" });
    expect(resolveLineColor(mug, undefined)).toEqual({ kind: "none" });
    expect(resolveLineColor(mug, "Red")).toEqual({ kind: "invalid", color: "Red" });
  });
});

describe("priceCart", () => {
  it("prices every color line of a product at the tier for the product's TOTAL quantity", () => {
    const pricing = priceCart(
      [
        { productId: "vest", color: "Black", quantity: 6 },
        { productId: "vest", color: "Navy", quantity: 6 },
      ],
      lookup
    );
    // 6 + 6 = 12 units reaches the 12+ tier even though each line alone is 6.
    expect(pricing.lines.map((entry) => entry.unitPrice)).toEqual([90, 90]);
    expect(pricing.lines.map((entry) => entry.lineTotal)).toEqual([540, 540]);
    expect(pricing.subtotal).toBe(1080);
    expect(pricing.products).toEqual([
      expect.objectContaining({ productId: "vest", totalQuantity: 12, lineCount: 2, belowMinimum: false }),
    ]);
  });

  it("does not let one product's quantity affect another product's tier", () => {
    const pricing = priceCart(
      [
        { productId: "vest", color: "Black", quantity: 6 },
        { productId: "mug", quantity: 49 },
      ],
      lookup
    );
    expect(pricing.lines.map((entry) => entry.unitPrice)).toEqual([100, 5]);
  });

  it("flags a product whose total is under its minimum, summing across colors", () => {
    const under = priceCart(
      [
        { productId: "vest", color: "Black", quantity: 2 },
        { productId: "vest", color: "Navy", quantity: 3 },
      ],
      lookup
    );
    expect(under.products[0]).toMatchObject({ totalQuantity: 5, minimum: 6, belowMinimum: true });

    const ok = priceCart(
      [
        { productId: "vest", color: "Black", quantity: 2 },
        { productId: "vest", color: "Navy", quantity: 4 },
      ],
      lookup
    );
    expect(ok.products[0].belowMinimum).toBe(false);
  });

  it("reports products that no longer exist instead of throwing", () => {
    const pricing = priceCart([{ productId: "gone", quantity: 3 }, { productId: "mug", quantity: 2 }], lookup);
    expect(pricing.unknownProductIds).toEqual(["gone"]);
    expect(pricing.lines).toHaveLength(1);
  });

  it("rounds line totals to cents", () => {
    const odd: CartPricingProduct = { id: "odd", name: "Odd", tiers: [{ quantity: 1, price: 0.333 }] };
    const pricing = priceCart([{ productId: "odd", quantity: 3 }], (id) => (id === "odd" ? odd : undefined));
    expect(pricing.lines[0].lineTotal).toBe(1);
  });
});

describe("validateCart (server-side rules)", () => {
  it("accepts valid colored and uncolored lines and prices them", () => {
    const result = validateCart(
      [
        { productId: "vest", color: "Iron", quantity: 12 },
        { productId: "mug", quantity: 10 },
      ],
      lookup
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pricing.subtotal).toBe(12 * 90 + 10 * 5);
  });

  it("requires a color on a product that has colors, naming the product", () => {
    const result = validateCart([{ productId: "vest", quantity: 6 }], lookup);
    expect(result).toEqual({ ok: false, error: 'Please choose a color for "Test Vest".' });
  });

  it("rejects a color the product does not offer", () => {
    const result = validateCart([{ productId: "vest", color: "Purple", quantity: 6 }], lookup);
    expect(result).toEqual({
      ok: false,
      error: '"Purple" is not an available color for "Test Vest".',
    });
  });

  it("rejects a color on a product that has none", () => {
    const result = validateCart([{ productId: "mug", color: "Red", quantity: 5 }], lookup);
    expect(result).toEqual({ ok: false, error: '"Test Mug" does not have color options.' });
  });

  it("rejects unknown products", () => {
    const result = validateCart([{ productId: "gone", quantity: 5 }], lookup);
    expect(result.ok).toBe(false);
  });

  it("enforces the minimum on the product total, not per line", () => {
    const tooFew = validateCart(
      [
        { productId: "vest", color: "Black", quantity: 3 },
        { productId: "vest", color: "Navy", quantity: 2 },
      ],
      lookup
    );
    expect(tooFew.ok).toBe(false);
    if (!tooFew.ok) expect(tooFew.error).toContain("Minimum order for \"Test Vest\" is 6 units");

    const enough = validateCart(
      [
        { productId: "vest", color: "Black", quantity: 3 },
        { productId: "vest", color: "Navy", quantity: 3 },
      ],
      lookup
    );
    expect(enough.ok).toBe(true);
  });
});

describe("cartLineKey", () => {
  it("distinguishes colors and treats no color consistently", () => {
    expect(cartLineKey("a", "Red")).not.toBe(cartLineKey("a", "Blue"));
    expect(cartLineKey("a", undefined)).toBe(cartLineKey("a", undefined));
    expect(cartLineKey("a", undefined)).not.toBe(cartLineKey("a", "Red"));
  });
});
