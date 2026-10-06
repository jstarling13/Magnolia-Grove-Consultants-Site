/**
 * Shopper filter state for the merchandise storefront: what the URL carries,
 * how it is read back, the price buckets, and the removable "active filter"
 * chips. Pure and framework-free; the sort and filter functions themselves
 * live in merchCatalog.ts.
 *
 * Query string (every key is omitted at its default):
 *   category=Apparel   hub only; a category name
 *   brand=Nike         a real brand
 *   q=mug              search text
 *   sort=price-asc     any SortKey other than "featured"
 *   usa=1              made in the USA
 *   price=5-15         first-tier price range, min inclusive, max exclusive;
 *                      either side may be empty ("40-" and "-2.5")
 *   minqty=100         smallest order of at most 25, 100 or 250 units
 *   colors=10          10 or more colors
 *   photos=1           has real color photos
 */

import {
  FILTER_ALL,
  MANY_COLORS,
  MIN_QTY_CHOICES,
  NO_FILTERS,
  hasProductFilters,
  isSortKey,
  startingTier,
  type CatalogProduct,
  type PriceRange,
  type ProductFilters,
  type SortKey,
} from "@/lib/merchCatalog";

export interface CatalogParams {
  /** FILTER_ALL when no category is chosen (hub only). */
  category: string;
  /** FILTER_ALL when no brand is chosen. */
  brand: string;
  /** Trimmed search text. */
  query: string;
  sort: SortKey;
  filters: ProductFilters;
}

export const DEFAULT_PARAMS: CatalogParams = {
  category: FILTER_ALL,
  brand: FILTER_ALL,
  query: "",
  sort: "featured",
  filters: NO_FILTERS,
};

/** What a URL's values are checked against. */
export interface ParseContext {
  /** The hub's categories; omit on a category page (the path is the category). */
  categories?: readonly string[];
  brands: readonly string[];
}

const QUERY_MAX = 120;
const NUMBER = "\\d{1,6}(?:\\.\\d{1,2})?";
const RANGE = new RegExp(`^(${NUMBER})?-(${NUMBER})?$`);

function parseRange(value: string | null): PriceRange | null {
  const match = value ? RANGE.exec(value) : null;
  if (!match || (match[1] === undefined && match[2] === undefined)) return null;
  const min = match[1] === undefined ? null : Number(match[1]);
  const max = match[2] === undefined ? null : Number(match[2]);
  if (min !== null && max !== null && min >= max) return null;
  return { min, max };
}

function rangeToParam(range: PriceRange): string {
  return `${range.min ?? ""}-${range.max ?? ""}`;
}

/** Reads the shopper's view from a query string; anything unknown or malformed is ignored. */
export function parseCatalogParams(search: string, context: ParseContext): CatalogParams {
  const params = new URLSearchParams(search);
  const category = params.get("category");
  const brand = params.get("brand");
  const sort = params.get("sort");
  const minQty = Number(params.get("minqty"));
  return {
    category: category && context.categories?.includes(category) ? category : FILTER_ALL,
    brand: brand && context.brands.includes(brand) ? brand : FILTER_ALL,
    query: (params.get("q") ?? "").trim().slice(0, QUERY_MAX),
    sort: isSortKey(sort) ? sort : "featured",
    filters: {
      usa: params.get("usa") === "1",
      photos: params.get("photos") === "1",
      manyColors: params.get("colors") === String(MANY_COLORS),
      minQty: (MIN_QTY_CHOICES as readonly number[]).includes(minQty) ? minQty : null,
      price: parseRange(params.get("price")),
    },
  };
}

/**
 * `search` (as in location.search) with the catalog's keys set to `params`;
 * keys it does not know about are kept. The result has no leading "?" and is
 * empty when nothing is set.
 */
export function applyCatalogParams(search: string, params: CatalogParams): string {
  const next = new URLSearchParams(search);
  const put = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  const { filters } = params;
  put("category", params.category === FILTER_ALL ? null : params.category);
  put("brand", params.brand === FILTER_ALL ? null : params.brand);
  put("q", params.query || null);
  put("sort", params.sort === "featured" ? null : params.sort);
  put("usa", filters.usa ? "1" : null);
  put("price", filters.price ? rangeToParam(filters.price) : null);
  put("minqty", filters.minQty === null ? null : String(filters.minQty));
  put("colors", filters.manyColors ? String(MANY_COLORS) : null);
  put("photos", filters.photos ? "1" : null);
  return next.toString();
}

export function sameParams(a: CatalogParams, b: CatalogParams): boolean {
  return (
    a.category === b.category &&
    a.brand === b.brand &&
    a.query === b.query &&
    a.sort === b.sort &&
    filtersKey(a.filters) === filtersKey(b.filters)
  );
}

/** Stable text for a set of filters, for comparing and for resetting "show more". */
export function filtersKey(filters: ProductFilters): string {
  return [
    filters.usa ? "usa" : "",
    filters.photos ? "photos" : "",
    filters.manyColors ? "colors" : "",
    filters.minQty ?? "",
    filters.price ? rangeToParam(filters.price) : "",
  ].join(",");
}

// ---------------------------------------------------------------------------
// Price buckets
// ---------------------------------------------------------------------------

export interface PriceBucket extends PriceRange {
  label: string;
}

/** "$5" or "$2.50": whole dollars drop the cents. */
function money(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function priceRangeLabel({ min, max }: PriceRange): string {
  if (min === null && max !== null) return `Under ${money(max)}`;
  if (min !== null && max === null) return `${money(min)} and up`;
  return `${money(min ?? 0)} to ${money(max ?? 0)}`;
}

export function samePriceRange(a: PriceRange | null, b: PriceRange | null): boolean {
  return a === b || (a !== null && b !== null && a.min === b.min && a.max === b.max);
}

const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];

/** The closest "round" price (1, 1.5, 2, 2.5, 3, 4, 5, 7.5 times a power of ten). */
function niceNumber(value: number): number {
  const scale = 10 ** Math.floor(Math.log10(value));
  let best = scale;
  for (const step of NICE_STEPS) {
    const candidate = step * scale;
    if (Math.abs(candidate - value) < Math.abs(best - value)) best = candidate;
  }
  return Number(best.toFixed(2));
}

/**
 * Price buckets for a set of first-tier prices: the prices are split into
 * `count` groups of about equal size, and each cut is rounded to a round
 * number so the labels read well ("Under $2.50", "$5 to $15", "$40 and up").
 * Cuts that round to the same number are merged, so a narrow price spread
 * yields fewer buckets; fewer than two distinct prices yield none.
 */
export function priceBuckets(prices: readonly number[], count = 5): PriceBucket[] {
  const sorted = prices.filter((price) => price > 0).sort((a, b) => a - b);
  if (sorted.length < 2 || sorted[0] === sorted[sorted.length - 1]) return [];
  const edges: number[] = [];
  for (let step = 1; step < count; step++) {
    const cut = niceNumber(sorted[Math.floor((step * sorted.length) / count)]);
    if (cut > sorted[0] && cut <= sorted[sorted.length - 1] && cut > (edges.at(-1) ?? 0)) {
      edges.push(cut);
    }
  }
  if (edges.length === 0) return [];
  const bounds: (number | null)[] = [null, ...edges, null];
  return bounds.slice(0, -1).map((min, index) => {
    const range = { min, max: bounds[index + 1] };
    return { ...range, label: priceRangeLabel(range) };
  });
}

/** Buckets from the first-tier customer prices of `products`. */
export function priceBucketsFor(
  products: readonly CatalogProduct[],
  count?: number
): PriceBucket[] {
  return priceBuckets(
    products.map((product) => startingTier(product).price),
    count
  );
}

// ---------------------------------------------------------------------------
// Active filter chips
// ---------------------------------------------------------------------------

export interface FilterChip {
  key: string;
  label: string;
  /** What to change in the params to take this filter off. */
  remove: Partial<CatalogParams>;
}

/**
 * One removable chip per active search, brand or product filter. The
 * category is not one: the category pills already show it.
 */
export function activeFilterChips(params: CatalogParams): FilterChip[] {
  const { filters } = params;
  const chips: FilterChip[] = [];
  if (params.query) {
    chips.push({ key: "query", label: `Search: ${params.query}`, remove: { query: "" } });
  }
  if (params.brand !== FILTER_ALL) {
    chips.push({ key: "brand", label: `Brand: ${params.brand}`, remove: { brand: FILTER_ALL } });
  }
  if (filters.usa) {
    chips.push({
      key: "usa",
      label: "Made in USA",
      remove: { filters: { ...filters, usa: false } },
    });
  }
  if (filters.price) {
    chips.push({
      key: "price",
      label: `Price: ${priceRangeLabel(filters.price)}`,
      remove: { filters: { ...filters, price: null } },
    });
  }
  if (filters.minQty !== null) {
    chips.push({
      key: "minqty",
      label: `Minimum order: ${filters.minQty} or fewer`,
      remove: { filters: { ...filters, minQty: null } },
    });
  }
  if (filters.manyColors) {
    chips.push({
      key: "colors",
      label: `${MANY_COLORS}+ colors`,
      remove: { filters: { ...filters, manyColors: false } },
    });
  }
  if (filters.photos) {
    chips.push({
      key: "photos",
      label: "Has color photos",
      remove: { filters: { ...filters, photos: false } },
    });
  }
  return chips;
}

/** Everything the "Clear all" control resets. The sort order is a preference, not a filter. */
export const CLEAR_ALL: Pick<CatalogParams, "category" | "brand" | "query" | "filters"> = {
  category: FILTER_ALL,
  brand: FILTER_ALL,
  query: "",
  filters: NO_FILTERS,
};

/** True when anything Clear all would reset is set. */
export function hasActiveParams(params: CatalogParams, queryInput = ""): boolean {
  return (
    params.category !== FILTER_ALL ||
    params.brand !== FILTER_ALL ||
    params.query !== "" ||
    queryInput !== "" ||
    hasProductFilters(params.filters)
  );
}
