/**
 * Browser-side loader for the rest of a category's cards. The storefront only
 * ships the first cards of each category in the page itself; the remainder is
 * a static JSON file per category (see category/[slug]/cards.json/route.ts).
 * Client-safe: it touches neither the product config nor any server module.
 */

import type { CatalogProduct } from "@/lib/merchCatalog";
import { categorySlug } from "@/lib/merchSlug";

export function categoryCardsUrl(category: string): string {
  return `/merchandise/category/${categorySlug(category)}/cards.json`;
}

function isCardList(value: unknown): value is CatalogProduct[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as CatalogProduct).id === "string" &&
        Array.isArray((item as CatalogProduct).tiers) &&
        (item as CatalogProduct).tiers.length > 0
    )
  );
}

/** Fetches every card of one category; rejects on a network or format error. */
export async function fetchCategoryCards(
  category: string,
  fetchImpl: typeof fetch = fetch
): Promise<CatalogProduct[]> {
  const response = await fetchImpl(categoryCardsUrl(category));
  if (!response.ok) throw new Error(`Could not load ${category} (${response.status})`);
  const data: unknown = await response.json();
  if (!isCardList(data)) throw new Error(`Unexpected data for ${category}`);
  return data;
}
