/**
 * "More in <category>" selection for the product page. Pure and
 * deterministic (no randomness) so server and client markup always match.
 */

import { isRealBrand, startingTier, type CatalogProduct } from "@/lib/merchCatalog";

export const RELATED_LIMIT = 4;

type RelatedInput = Pick<CatalogProduct, "id" | "category" | "brand" | "tiers">;

/**
 * Up to `limit` other products from the same category. Ordering: same real
 * brand first (an "Essentials" match means nothing, so it doesn't count),
 * then nearest starting price, then id so ties always resolve the same way.
 * A category with fewer other products simply returns fewer; it is never
 * padded from other categories.
 */
export function selectRelated<T extends RelatedInput>(
  current: RelatedInput,
  candidates: readonly T[],
  limit = RELATED_LIMIT
): T[] {
  const currentPrice = startingTier(current).price;
  const sameBrand = (product: RelatedInput) =>
    isRealBrand(current.brand) && product.brand === current.brand;

  return candidates
    .filter((product) => product.id !== current.id && product.category === current.category)
    .map((product) => ({
      product,
      brandRank: sameBrand(product) ? 0 : 1,
      priceGap: Math.abs(startingTier(product).price - currentPrice),
    }))
    .sort(
      (a, b) =>
        a.brandRank - b.brandRank ||
        a.priceGap - b.priceGap ||
        (a.product.id < b.product.id ? -1 : a.product.id > b.product.id ? 1 : 0)
    )
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.product);
}
