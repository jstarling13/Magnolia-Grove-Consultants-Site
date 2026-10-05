/**
 * Pure, framework-free helpers for the merchandise storefront.
 *
 * The storefront ships a *slim* product model (CatalogProduct) to the
 * browser instead of the full config object: cards and the detail page only
 * need display fields and customer-facing prices, so supplier/ESP price
 * data never enters the client bundle or the RSC payload. This file must
 * not import merchandiseConfig — it is used from client components.
 */

import { cleanColorName } from "@/lib/colorSwatches";
import type { ImprintArea } from "@/types";

export interface CatalogTier {
  quantity: number;
  /** Customer-facing per-unit price at this quantity. */
  price: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  /** Brand on the product's own label; "Essentials" means unbranded. */
  brand: string;
  description: string;
  image?: string;
  imageAlt?: string;
  colors?: string[];
  /** Real photo per color, keyed by an entry in `colors`. */
  colorImages?: Record<string, string>;
  /** Sorted ascending by quantity; never empty. */
  tiers: CatalogTier[];
  imprintArea: ImprintArea;
}

/** Shape the server-side adapter reads from a full config product. */
interface SourceProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  image?: string;
  imageAlt?: string;
  colors?: string[];
  colorImages?: Record<string, string>;
  priceTiers: { quantity: number; price: number }[];
}

const UNBRANDED = "Essentials";
const CARD_DESCRIPTION_MAX = 220;

/** True when the brand is a real name brand worth labelling on a card. */
export function isRealBrand(brand: string | undefined): boolean {
  const value = brand?.trim();
  return Boolean(value) && value!.toLowerCase() !== UNBRANDED.toLowerCase();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).trimEnd()}…`;
}

/**
 * Projects a config product to the slim storefront model. Deliberately an
 * allow-list: only the fields below survive, so adding cost/supplier fields
 * to the config can never leak through this path. Tiers are re-mapped to
 * {quantity, price} so `espPrice` is dropped.
 */
export function toCatalogProduct(
  product: SourceProduct,
  imprintArea: ImprintArea,
  options: { truncateDescription?: boolean } = {}
): CatalogProduct {
  const colors = product.colors
    ? Array.from(new Set(product.colors.map(cleanColorName).filter(Boolean)))
    : undefined;

  let colorImages: Record<string, string> | undefined;
  if (product.colorImages) {
    const entries = Object.entries(product.colorImages).map(
      ([color, src]) => [cleanColorName(color), src] as const
    );
    if (entries.length > 0) colorImages = Object.fromEntries(entries);
  }

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    description: options.truncateDescription
      ? truncate(product.description, CARD_DESCRIPTION_MAX)
      : product.description,
    image: product.image,
    imageAlt: product.imageAlt,
    colors: colors && colors.length > 0 ? colors : undefined,
    colorImages,
    tiers: product.priceTiers
      .map((tier) => ({ quantity: tier.quantity, price: tier.price }))
      .sort((a, b) => a.quantity - b.quantity),
    imprintArea,
  };
}

export function startingTier(product: Pick<CatalogProduct, "tiers">): CatalogTier {
  return product.tiers[0];
}

export function bestTier(product: Pick<CatalogProduct, "tiers">): CatalogTier {
  return product.tiers[product.tiers.length - 1];
}

/** Best (lowest per-unit) tier the quantity qualifies for. */
export function tierForQuantity(
  product: Pick<CatalogProduct, "tiers">,
  quantity: number
): CatalogTier {
  let best = product.tiers[0];
  for (const tier of product.tiers) {
    if (quantity >= tier.quantity) best = tier;
  }
  return best;
}

/** The next tier above `quantity`, if any — used for "order N more to save". */
export function nextTier(
  product: Pick<CatalogProduct, "tiers">,
  quantity: number
): CatalogTier | undefined {
  return product.tiers.find((tier) => tier.quantity > quantity);
}

export function formatPrice(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Sorting / filtering
// ---------------------------------------------------------------------------

export type SortKey = "featured" | "price-asc" | "price-desc" | "name";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A to Z" },
];

export function isSortKey(value: string | null | undefined): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/**
 * Sorts a copy of `list`. "featured" keeps the order the server supplied
 * (name brands first, then price high to low); the others are stable, with
 * featured order as the tie-break.
 */
export function sortProducts(list: CatalogProduct[], sort: SortKey): CatalogProduct[] {
  if (sort === "featured") return list;
  const rank = new Map(list.map((product, index) => [product.id, index]));
  const byRank = (a: CatalogProduct, b: CatalogProduct) => rank.get(a.id)! - rank.get(b.id)!;
  const sorted = [...list];
  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => startingTier(a).price - startingTier(b).price || byRank(a, b));
      break;
    case "price-desc":
      sorted.sort((a, b) => startingTier(b).price - startingTier(a).price || byRank(a, b));
      break;
    case "name":
      sorted.sort(
        (a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }) ||
          byRank(a, b)
      );
      break;
  }
  return sorted;
}

/** Lower-cased searchable text for a product; compute once per product. */
export function searchHaystack(product: CatalogProduct): string {
  return [
    product.name,
    product.brand,
    product.category,
    product.description,
    ...(product.colors ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

/** Every whitespace-separated term must appear (AND semantics). */
export function matchesQuery(haystack: string, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}

// ---------------------------------------------------------------------------
// Progressive disclosure
// ---------------------------------------------------------------------------

export const INITIAL_VISIBLE = 8;
export const SHOW_MORE_STEP = 24;
/** When a single category is focused the shopper wants depth, so start deeper. */
export const FOCUSED_INITIAL_VISIBLE = 24;

/** New visible count after "Show more"; never exceeds the total. */
export function growVisible(current: number, total: number, step = SHOW_MORE_STEP): number {
  return Math.min(total, current + step);
}

/** How many items the next "Show more" click will reveal. */
export function nextBatchSize(current: number, total: number, step = SHOW_MORE_STEP): number {
  return Math.max(0, Math.min(step, total - current));
}
