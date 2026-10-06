/**
 * "More in <category>" selection for the product page. Pure and
 * deterministic (no randomness) so server and client markup always match.
 */

import { isRealBrand, startingTier, type CatalogProduct } from "@/lib/merchCatalog";

export const RELATED_LIMIT = 4;

/** `name` is optional so callers without one (and older tests) still work. */
type RelatedInput = Pick<CatalogProduct, "id" | "category" | "brand" | "tiers"> & {
  name?: string;
  /** Product type; a product of the same type is a closer match than one of another type. */
  type?: string;
};

/**
 * Weights of the relevance score. Name similarity is a 0..1 Dice coefficient
 * over product-type words, so a near-identical name is worth three points and
 * a shared real brand one: a same-brand item of another kind still beats an
 * unrelated one, but a different brand's near-twin beats a same-brand item
 * that shares nothing but the label.
 */
const NAME_WEIGHT = 3;
const BRAND_WEIGHT = 1;
/** Same product type: worth less than a shared brand, but it breaks ties between look-alikes. */
const TYPE_WEIGHT = 0.5;

/** Words that say nothing about what the product is. */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "men",
  "mens",
  "women",
  "womens",
  "ladies",
  "unisex",
  "youth",
  "kids",
  "kid",
  "adult",
  "custom",
  "customized",
  "logo",
  "logos",
  "imprint",
  "imprinted",
  "promotional",
  "branded",
  "new",
  "pack",
  "set",
  "pair",
  "oz",
  "pc",
  "pcs",
  "pk",
  "gsm",
  "usa",
  "made",
]);

/** Spellings of the same thing that tokenize differently ("t-shirt", "tshirt", "tee"). */
const ALIASES: Record<string, string> = { tee: "tshirt", tees: "tshirt" };

/**
 * Distinguishing words of a product name: lower-case, punctuation and
 * numbers dropped, "t-shirt" kept as one word, a trailing plural "s" folded,
 * and anything in `exclude` (the brand's own words) left out.
 */
export function nameTokens(name: string | undefined, exclude: ReadonlySet<string>): Set<string> {
  const tokens = new Set<string>();
  const text = (name ?? "")
    .toLowerCase()
    .replace(/\bt[\s-]?shirts?\b/g, "tshirt")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
  for (const raw of text.split(" ")) {
    if (raw.length < 2 || /^\d+$/.test(raw)) continue;
    const word = ALIASES[raw] ?? (raw.length > 3 && raw.endsWith("s") ? raw.slice(0, -1) : raw);
    if (STOP_WORDS.has(raw) || STOP_WORDS.has(word) || exclude.has(raw) || exclude.has(word)) {
      continue;
    }
    tokens.add(word);
  }
  return tokens;
}

/** Dice coefficient of two token sets: 0 (nothing shared) to 1 (identical). */
function dice(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  return (2 * shared) / (a.size + b.size);
}

function brandWords(brand: string): Set<string> {
  return new Set(
    brand
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 1)
  );
}

/**
 * Up to `limit` other products from the same category, most relevant first.
 * Relevance is name similarity (shared product-type words, ignoring brand
 * names, sizes and filler like "Men's") plus a bonus for the same real brand
 * (an "Essentials" match means nothing, so it doesn't count). Ties go to the
 * nearest starting price, then to the id, so the order never varies. A product
 * of the same type (see config/productTypes) scores a little higher.
 * A category with fewer other products simply returns fewer; it is never
 * padded from other categories.
 */
export function selectRelated<T extends RelatedInput>(
  current: RelatedInput,
  candidates: readonly T[],
  limit = RELATED_LIMIT
): T[] {
  const currentPrice = startingTier(current).price;
  const realBrand = isRealBrand(current.brand);
  const currentBrandWords = realBrand ? brandWords(current.brand) : new Set<string>();

  return candidates
    .filter((product) => product.id !== current.id && product.category === current.category)
    .map((product) => {
      const sameBrand = realBrand && product.brand === current.brand;
      // Brand words are left out of both sides so the brand counts once.
      const exclude = new Set([...currentBrandWords, ...brandWords(product.brand)]);
      const similarity = dice(nameTokens(current.name, exclude), nameTokens(product.name, exclude));
      return {
        product,
        score:
          NAME_WEIGHT * similarity +
          (sameBrand ? BRAND_WEIGHT : 0) +
          (current.type !== undefined && product.type === current.type ? TYPE_WEIGHT : 0),
        priceGap: Math.abs(startingTier(product).price - currentPrice),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.priceGap - b.priceGap ||
        (a.product.id < b.product.id ? -1 : a.product.id > b.product.id ? 1 : 0)
    )
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.product);
}
