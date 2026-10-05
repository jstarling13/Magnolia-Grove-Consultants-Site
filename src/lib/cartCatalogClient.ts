/**
 * Browser-side loaders for the cart's product data. The cart page ships no
 * catalog; it fetches one small static JSON file per product in the cart (see
 * merchandise/[id]/cart.json/route.ts) and, once per visit with a non-empty
 * cart, the list of ids still on sale (merchandise/ids.json/route.ts).
 * Client-safe: it touches neither the product config nor any server module.
 */

import type { CartProduct } from "@/lib/merchCatalog";

export function cartProductUrl(productId: string): string {
  return `/merchandise/${encodeURIComponent(productId)}/cart.json`;
}

export const AVAILABLE_IDS_URL = "/merchandise/ids.json";

export type CartProductResult =
  | { kind: "ok"; product: CartProduct }
  /** The server says this product does not exist (any more). */
  | { kind: "missing" };

function isCartProduct(value: unknown, id: string): value is CartProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as CartProduct;
  return (
    product.id === id &&
    typeof product.name === "string" &&
    typeof product.category === "string" &&
    Array.isArray(product.tiers) &&
    product.tiers.length > 0 &&
    product.tiers.every(
      (tier) => typeof tier.quantity === "number" && typeof tier.price === "number"
    )
  );
}

/**
 * Fetches one product for the cart. A 404 means the product is gone
 * ("missing"); any other failure (offline, 5xx, bad data) rejects, so the
 * caller can keep the shopper's saved lines and offer a retry instead of
 * deleting them.
 */
export async function fetchCartProduct(
  productId: string,
  fetchImpl: typeof fetch = fetch
): Promise<CartProductResult> {
  const response = await fetchImpl(cartProductUrl(productId));
  if (response.status === 404) return { kind: "missing" };
  if (!response.ok) throw new Error(`Could not load ${productId} (${response.status})`);
  const data: unknown = await response.json();
  if (!isCartProduct(data, productId)) throw new Error(`Unexpected data for ${productId}`);
  return { kind: "ok", product: data };
}

/** Fetches the ids of every product on sale; rejects on a network or format error. */
export async function fetchAvailableProductIds(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const response = await fetchImpl(AVAILABLE_IDS_URL);
  if (!response.ok) throw new Error(`Could not load product list (${response.status})`);
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every((entry) => typeof entry === "string")) {
    throw new Error("Unexpected product list");
  }
  return data;
}
