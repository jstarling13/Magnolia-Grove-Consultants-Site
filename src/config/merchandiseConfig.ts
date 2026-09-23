/**
 * ============================================================================
 * MERCHANDISE — CATALOG + REQUEST FORM CONFIG
 * ============================================================================
 * Products are added here one at a time as real items are provided — never
 * fabricate a product, price, or image. `price` is always
 * espPrice * (1 + MARKUP_RATE), rounded to the cent.
 *
 * Pricing model (verified): the 5% surcharge applies to the ESP selling
 * price, NOT raw supplier cost — the ESP price already has ASI's own markup
 * baked in. Example: supplier cost $0.60, ESP price $1.00 -> client pays
 * $1.05. There is no revenue split beyond that; see src/lib/asi/pricing.ts
 * for the full order-time quote logic (quantity, setup, decoration,
 * shipping) once real SmartLink data is wired in.
 * ============================================================================
 */

import type { MerchProduct } from "@/types";

export const MARKUP_RATE = 0.05;

function clientPrice(espPrice: number): number {
  return Math.round(espPrice * (1 + MARKUP_RATE) * 100) / 100;
}

export const merchandisePage = {
  eyebrow: "Merchandise",
  headline: "Campaign & Business Merchandise",
  subtitle:
    "Browse a few of our most-requested items below, or tell us what you're looking for — we can source almost anything through our supplier network.",
  requestEyebrow: "Don't See It?",
  requestHeadline: "Request Any Product",
  requestSubtitle:
    "Describe what you need — product type, quantity, budget, and deadline — and we'll source it and send back a quote.",
};

export const merchandiseCategories = [
  "Apparel",
  "Drinkware",
  "Bags",
  "Tech Accessories",
  "Office & Writing",
  "Event & Signage",
] as const;

// Add real products here, one at a time. `price` = cost * (1 + MARKUP_RATE).
export const products: MerchProduct[] = [];
