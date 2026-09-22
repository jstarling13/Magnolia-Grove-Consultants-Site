/**
 * ============================================================================
 * MERCHANDISE — CATALOG + REQUEST FORM CONFIG
 * ============================================================================
 * Products are added here one at a time as real items (with real ASI/supplier
 * cost) are provided — never fabricate a product, price, or image. `price`
 * is always cost * MARKUP_MULTIPLIER, computed once at data-entry time so
 * the number displayed to clients never has to be recalculated in the UI.
 * ============================================================================
 */

import type { MerchProduct } from "@/types";

export const MARKUP_RATE = 0.05;

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
