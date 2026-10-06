/**
 * Cart pricing and validation shared by the browser cart and the checkout
 * API, so the two can never drift apart. Pure functions only: no server-only
 * or supplier (ESP) imports, because this file ships in the client bundle.
 *
 * Rules (decision: this is how promo catalogs generally quote, and the admin
 * confirms the final quote anyway):
 *  - Every distinct (product, color) is its own cart line.
 *  - The volume price break for a product is chosen by the TOTAL quantity of
 *    that product across all of its color lines; every line of the product
 *    is shown and charged at that one shared tier price.
 *  - A product's minimum order is the smallest quantity in its price tiers,
 *    and it applies to the product's total across colors.
 *  - A product that has colors needs one of them on every line. A product
 *    without colors never carries one.
 */

import { normalizeColors, tierForQuantity, type CatalogTier } from "@/lib/merchCatalog";

/** The slice of a product that pricing needs. Extra fields are ignored. */
export interface CartPricingProduct {
  id: string;
  name: string;
  /** Raw or already-clean color names; always compared via normalizeColors. */
  colors?: readonly string[];
  /** Customer-facing tiers, ascending by quantity. */
  tiers: CatalogTier[];
}

export interface CartLineInput {
  productId: string;
  color?: string;
  quantity: number;
  /** Free-text size breakdown and imprint notes. Carried along with the line; they never affect price or validation. */
  sizes?: string;
  imprintNotes?: string;
}

export type ProductLookup = (productId: string) => CartPricingProduct | undefined;

export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function lineTotal(unitPrice: number, quantity: number): number {
  return roundCents(unitPrice * quantity);
}

/** Smallest quantity in the product's price tiers: the least that can be ordered. */
export function minimumOrderQuantity(product: Pick<CartPricingProduct, "tiers">): number {
  return Math.min(...product.tiers.map((tier) => tier.quantity));
}

/** Stable identity of a cart line. */
export function cartLineKey(productId: string, color: string | undefined): string {
  return `${productId}::${color ?? ""}`;
}

/** Normalises "no color" so undefined, null and blank strings all compare equal. */
export function cleanLineColor(color: string | null | undefined): string | undefined {
  const value = typeof color === "string" ? color.trim() : "";
  return value ? value : undefined;
}

export type LineColorState =
  | { kind: "none" } // product has no colors; the line carries none
  | { kind: "ok"; color: string }
  | { kind: "missing" } // product has colors but the line has none (legacy line)
  | { kind: "invalid"; color: string }; // line color isn't one of the product's colors

/** How a line's color relates to what its product offers. */
export function resolveLineColor(
  product: Pick<CartPricingProduct, "colors">,
  color: string | undefined
): LineColorState {
  const options = normalizeColors(product.colors);
  const wanted = cleanLineColor(color);
  if (options.length === 0) return wanted ? { kind: "invalid", color: wanted } : { kind: "none" };
  if (!wanted) return { kind: "missing" };
  return options.includes(wanted)
    ? { kind: "ok", color: wanted }
    : { kind: "invalid", color: wanted };
}

export interface ProductPricingSummary {
  productId: string;
  /** Units of this product across every color line. */
  totalQuantity: number;
  minimum: number;
  belowMinimum: boolean;
  /** The shared tier all of this product's lines are priced at. */
  tier: CatalogTier;
  lineCount: number;
}

export interface PricedLine<L extends CartLineInput = CartLineInput> {
  line: L;
  unitPrice: number;
  lineTotal: number;
}

export interface CartPricing<L extends CartLineInput = CartLineInput> {
  lines: PricedLine<L>[];
  /** Per product, in order of first appearance. */
  products: ProductPricingSummary[];
  /** Product ids that no longer exist; their lines are not priced. */
  unknownProductIds: string[];
  subtotal: number;
}

/** Prices every line at its product's shared tier. Tolerant: unknown products are reported, not thrown. */
export function priceCart<L extends CartLineInput>(
  lines: readonly L[],
  getProduct: ProductLookup
): CartPricing<L> {
  const known: L[] = [];
  const unknownProductIds: string[] = [];
  for (const line of lines) {
    if (getProduct(line.productId)) known.push(line);
    else if (!unknownProductIds.includes(line.productId)) unknownProductIds.push(line.productId);
  }

  const summaries = new Map<string, ProductPricingSummary>();
  for (const line of known) {
    const existing = summaries.get(line.productId);
    if (existing) {
      existing.totalQuantity += line.quantity;
      existing.lineCount += 1;
      continue;
    }
    const product = getProduct(line.productId)!;
    summaries.set(line.productId, {
      productId: line.productId,
      totalQuantity: line.quantity,
      minimum: minimumOrderQuantity(product),
      belowMinimum: false,
      tier: product.tiers[0],
      lineCount: 1,
    });
  }
  for (const summary of summaries.values()) {
    const product = getProduct(summary.productId)!;
    summary.tier = tierForQuantity(product, summary.totalQuantity);
    summary.belowMinimum = summary.totalQuantity < summary.minimum;
  }

  const priced = known.map((line) => {
    const { tier } = summaries.get(line.productId)!;
    return { line, unitPrice: tier.price, lineTotal: lineTotal(tier.price, line.quantity) };
  });

  return {
    lines: priced,
    products: Array.from(summaries.values()),
    unknownProductIds,
    subtotal: roundCents(priced.reduce((sum, entry) => sum + entry.lineTotal, 0)),
  };
}

export type CartValidation<L extends CartLineInput = CartLineInput> =
  { ok: true; pricing: CartPricing<L> } | { ok: false; error: string };

/**
 * Strict, server-side check of a submitted cart. Never trusts the client:
 * the product must exist, a colored product needs one of its exact colors,
 * an uncolored product must not carry one, and each product's total must
 * reach its minimum order.
 */
export function validateCart<L extends CartLineInput>(
  lines: readonly L[],
  getProduct: ProductLookup
): CartValidation<L> {
  for (const line of lines) {
    const product = getProduct(line.productId);
    if (!product) {
      return { ok: false, error: "Your cart contains a product that's no longer available." };
    }
    const state = resolveLineColor(product, line.color);
    if (state.kind === "missing") {
      return { ok: false, error: `Please choose a color for "${product.name}".` };
    }
    if (state.kind === "invalid") {
      const error =
        normalizeColors(product.colors).length === 0
          ? `"${product.name}" does not have color options.`
          : `"${state.color}" is not an available color for "${product.name}".`;
      return { ok: false, error };
    }
  }

  const pricing = priceCart(lines, getProduct);
  for (const summary of pricing.products) {
    if (summary.belowMinimum) {
      const product = getProduct(summary.productId)!;
      return {
        ok: false,
        error: `Minimum order for "${product.name}" is ${summary.minimum} units (you have ${summary.totalQuantity}).`,
      };
    }
  }
  return { ok: true, pricing };
}
