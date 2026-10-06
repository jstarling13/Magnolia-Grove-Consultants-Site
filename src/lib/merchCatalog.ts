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
  /** Size-pricing caveat for the product page; absent on ordinary products. */
  priceNote?: string;
  image?: string;
  imageAlt?: string;
  colors?: string[];
  /** Real photo per color, keyed by an entry in `colors`. */
  colorImages?: Record<string, string>;
  /** The main photo already shows every color option, so no per-color photo note is needed. */
  allColorsInPhoto?: boolean;
  /**
   * Explicit made-in-USA flag, when the catalog data carries one (see
   * isMadeInUsa for what is used when it does not).
   */
  usa?: boolean;
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
  priceNote?: string;
  image?: string;
  imageAlt?: string;
  colors?: string[];
  colorImages?: Record<string, string>;
  allColorsInPhoto?: boolean;
  usa?: boolean;
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
 * Canonical color list for a product: supplier debris stripped, blanks
 * dropped, duplicates removed. The storefront, the cart and the checkout
 * API all validate against this one list, so a color the shopper picked
 * always compares equal to what the server expects.
 */
export function normalizeColors(colors: readonly string[] | undefined): string[] {
  if (!colors) return [];
  return Array.from(new Set(colors.map(cleanColorName).filter(Boolean)));
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
  const colors = normalizeColors(product.colors);

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
    ...(product.priceNote ? { priceNote: product.priceNote } : {}),
    ...(typeof product.usa === "boolean" ? { usa: product.usa } : {}),
    ...(product.allColorsInPhoto ? { allColorsInPhoto: true } : {}),
    image: product.image,
    imageAlt: product.imageAlt,
    colors: colors.length > 0 ? colors : undefined,
    colorImages,
    tiers: product.priceTiers
      .map((tier) => ({ quantity: tier.quantity, price: tier.price }))
      .sort((a, b) => a.quantity - b.quantity),
    imprintArea,
  };
}

/**
 * What the cart needs to show and price one product's lines: name, photo,
 * brand label (and category, for analytics events), colors with their photos,
 * and customer-facing tiers. No description or imprint area.
 */
export interface CartProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  image?: string;
  colors?: string[];
  colorImages?: Record<string, string>;
  tiers: CatalogTier[];
}

/**
 * Allow-list projection to the cart model, applied to the per-product JSON the
 * cart fetches. Takes the already-slim CatalogProduct, so supplier fields
 * (espPrice, links, ids) are gone before it runs, and re-maps tiers and
 * colorImages so nothing extra can ride along.
 */
export function toCartProduct(product: CatalogProduct): CartProduct {
  const colors = product.colors && product.colors.length > 0 ? [...product.colors] : undefined;
  const colorImages =
    colors && product.colorImages
      ? Object.fromEntries(
          Object.entries(product.colorImages).filter(([color]) => colors.includes(color))
        )
      : undefined;
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    ...(product.image ? { image: product.image } : {}),
    ...(colors ? { colors } : {}),
    ...(colorImages && Object.keys(colorImages).length > 0 ? { colorImages } : {}),
    tiers: product.tiers.map((tier) => ({ quantity: tier.quantity, price: tier.price })),
  };
}

/**
 * Lean projection for product cards, applied to every list the storefront
 * ships to the browser (initial cards and the lazily fetched remainder), so a
 * card looks the same before and after more products arrive.
 *
 * A card only ever prints the starting and the best tier, so the middle tiers
 * are dropped: `tiers[0]` and `tiers[tiers.length - 1]` (and whether there is
 * more than one) are unchanged, which is everything startingTier, bestTier
 * and the price sort read. imageAlt is dropped when it just repeats the name,
 * because the image falls back to the name anyway.
 */
export function toCardProduct(product: CatalogProduct): CatalogProduct {
  const { tiers, imageAlt, ...rest } = product;
  const card: CatalogProduct = {
    ...rest,
    tiers: tiers.length > 2 ? [tiers[0], tiers[tiers.length - 1]] : tiers,
  };
  if (imageAlt && imageAlt !== product.name) card.imageAlt = imageAlt;
  // the size-pricing note only shows on the product page, so cards do not carry it
  delete card.priceNote;
  return card;
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

/** A unit count with thousands separators: 10000 becomes "10,000". */
export function formatQuantity(value: number): string {
  return value.toLocaleString("en-US");
}

/** Smallest order that can be placed, in dollars: the first tier's quantity at its price. */
export function minimumOrderValue(product: Pick<CatalogProduct, "tiers">): number {
  const first = startingTier(product);
  return Math.round(first.quantity * first.price * 100) / 100;
}

/** A minimum order at or above this is shown as a dollar amount, not just a unit count. */
export const LARGE_MINIMUM_VALUE = 1000;
/** A pre-filled order line above this gets the "request a quote" note. */
export const LARGE_LINE_VALUE = 5000;

export const LARGE_MINIMUM_NOTE = "Large minimum - request a quote to confirm size and options.";

/** True when the smallest order is big enough that the shopper should see its dollar value. */
export function hasLargeMinimum(product: Pick<CatalogProduct, "tiers">): boolean {
  return minimumOrderValue(product) >= LARGE_MINIMUM_VALUE;
}

/**
 * True when a large minimum should also say "request a quote": the product
 * carries a size-pricing caveat (`priceNote`) or the pre-filled minimum line is
 * over $5,000. Never true for a minimum under $1,000. Cards carry no priceNote,
 * so there only the dollar threshold applies.
 */
export function suggestsQuote(product: Pick<CatalogProduct, "tiers" | "priceNote">): boolean {
  if (!hasLargeMinimum(product)) return false;
  return Boolean(product.priceNote) || minimumOrderValue(product) > LARGE_LINE_VALUE;
}

// ---------------------------------------------------------------------------
// Sorting / filtering
// ---------------------------------------------------------------------------

export type SortKey = "featured" | "price-asc" | "price-desc" | "moq-asc" | "colors-desc" | "name";

/**
 * "featured" is the default and the URL's absence of ?sort=. It means
 * relevance: the search ranking when there is a query, otherwise the order the
 * server supplied (name brands first, then price high to low).
 */
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "moq-asc", label: "Lowest Minimum Order" },
  { value: "colors-desc", label: "Most Colors" },
  { value: "name", label: "Name: A to Z" },
];

export function isSortKey(value: string | null | undefined): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/**
 * Sorts a copy of `list`. "featured" keeps the order of `list` (search
 * relevance, or the server's featured order); the others are stable, with
 * that order as the tie-break. Price is the first tier's customer price and
 * minimum order is the first tier's quantity.
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
    case "moq-asc":
      sorted.sort((a, b) => startingTier(a).quantity - startingTier(b).quantity || byRank(a, b));
      break;
    case "colors-desc":
      sorted.sort((a, b) => (b.colors?.length ?? 0) - (a.colors?.length ?? 0) || byRank(a, b));
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

// ---------------------------------------------------------------------------
// Product filters
// ---------------------------------------------------------------------------

/** Customer-price range on the first tier: `min` inclusive, `max` exclusive, null = open. */
export interface PriceRange {
  min: number | null;
  max: number | null;
}

export interface ProductFilters {
  /** Only products that state they are made in the USA. */
  usa: boolean;
  /** Only products with at least one real color photo. */
  photos: boolean;
  /** Only products with MANY_COLORS or more colors. */
  manyColors: boolean;
  /** Only products whose smallest order is at most this many units. */
  minQty: number | null;
  price: PriceRange | null;
}

export const MANY_COLORS = 10;
/** Choices for the minimum-quantity filter ("any" is the absence of a choice). */
export const MIN_QTY_CHOICES = [25, 100, 250] as const;

export const NO_FILTERS: ProductFilters = {
  usa: false,
  photos: false,
  manyColors: false,
  minQty: null,
  price: null,
};

export function hasProductFilters(filters: ProductFilters): boolean {
  return (
    filters.usa ||
    filters.photos ||
    filters.manyColors ||
    filters.minQty !== null ||
    filters.price !== null
  );
}

const USA_STATEMENT =
  /made[\s-]+in[\s-]+(?:the[\s-]+)?(?:usa|u\.s\.a?\.?|united states)|usa[\s-]+made/i;
const usaCache = new WeakMap<CatalogProduct, boolean>();

/**
 * True when the product says it is made in the USA. The catalog stores no
 * separate flag (the importer turns the supplier's flag into a "Made in the
 * USA." sentence at the start of the description), so an explicit `usa`
 * field wins when present and otherwise the name and description must
 * state it outright ("Made in USA", "USA made"). "Printed in USA" and
 * "USA Decorated" are not made-in claims. A product that says nothing is
 * unknown, not foreign, and is simply left out of the filter.
 */
export function isMadeInUsa(product: CatalogProduct): boolean {
  if (typeof product.usa === "boolean") return product.usa;
  let known = usaCache.get(product);
  if (known === undefined) {
    known = USA_STATEMENT.test(`${product.name} ${product.description}`);
    usaCache.set(product, known);
  }
  return known;
}

export function hasColorPhotos(product: Pick<CatalogProduct, "colorImages">): boolean {
  return Object.keys(product.colorImages ?? {}).length > 0;
}

export function matchesFilters(product: CatalogProduct, filters: ProductFilters): boolean {
  if (filters.usa && !isMadeInUsa(product)) return false;
  if (filters.photos && !hasColorPhotos(product)) return false;
  if (filters.manyColors && (product.colors?.length ?? 0) < MANY_COLORS) return false;
  const first = startingTier(product);
  if (filters.minQty !== null && first.quantity > filters.minQty) return false;
  if (filters.price) {
    const { min, max } = filters.price;
    if (min !== null && first.price < min) return false;
    if (max !== null && first.price >= max) return false;
  }
  return true;
}

/** Products that pass every filter, keeping their order; `list` itself when none is set. */
export function filterProducts(list: CatalogProduct[], filters: ProductFilters): CatalogProduct[] {
  return hasProductFilters(filters) ? list.filter((p) => matchesFilters(p, filters)) : list;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
//
// Matching is on word boundaries: a term matches a word that starts with it,
// so "red" finds "Red" and "Reddish" but not "colored", "tailored" or
// "powered". Plain substring matching is only a fallback for a query that has
// no word match anywhere (see searchProducts), so a fragment such as "shirt"
// still finds a one-word "TShirt" when nothing better exists.
//
// Plurals: every word is also indexed in singular form ("mugs" -> "mug",
// "totes" -> "tote", "batteries" -> "battery"), and a query word is tried as
// typed and in its possible singular forms, so "mugs" and "mug" find the same
// products. Short words and words ending in "ss", "us" or "is" are left alone
// ("glass", "dress", "bus").
//
// Synonyms: a small table maps shopper words to the catalog's words ("tshirt"
// to "T-Shirt" and "tee", "koozie" to "can cooler", "beanie" to "knit cap").
// A synonym match ranks just below an exact one, so what the shopper typed
// still comes first.
//
// Results are ranked by where the term was found (name, then brand, category,
// color, description) and then by how exact the match is (whole word, then
// word prefix, then substring). Three refinements keep the product the shopper
// means ahead of products that merely mention it:
//   - in the name, a word that is the product's noun ("Breakaway Lanyard")
//     beats one earlier in the name ("Lanyard Wallet Case"), which beats one
//     after "with", "for" ("Bluetooth Speaker with Lanyard");
//   - a name match in the category the term names ("lanyard" in "Lanyards &
//     Badges") gets a further boost;
//   - a match only in the description is pushed well below everything else.

/** Separates the searchable fields inside a haystack string. */
const FIELD_SEPARATOR = "\u001f";
/** Separates a field's words as written from the same words in singular form. */
const FORM_SEPARATOR = "\u001e";
/** Search fields in rank order; a lower index ranks higher. */
const SEARCH_FIELDS = ["name", "brand", "category", "color", "description"] as const;
/** Each field step outweighs every match kind (whole word, prefix, substring). */
const FIELD_STEP = 100;
/** Each match kind outweighs every position refinement inside the name. */
const KIND_STEP = 10;
/** Name positions, best first: the product's noun, an earlier word, after "with" and the like. */
const NAME_NOUN = 0;
const NAME_HEAD = 3;
const NAME_TAIL = 6;
/** Taken off a name match when the category also names the term ("lanyard", "Lanyards & Badges"). */
const CATEGORY_BONUS = 40;
/** Added to a description match, which says little about what the product is. */
const DESCRIPTION_PENALTY = 100;
/** Added to a synonym match so it ranks below the same match on the typed words. */
const SYNONYM_PENALTY = 30;
/** Words after which a name only describes an extra ("Speaker with Lanyard"). */
const NAME_CONNECTOR = / (?:with|w|for|by|featuring|includes|including|from) /;
/** Trailing words that are not the product's noun ("Tote Bag 15 x 16 in", "Tent Kit"). */
const NAME_FILLER =
  /^(?:\d.*|x|to|in|inch|inches|oz|ft|mm|cm|lb|lbs|pk|pack|packs|set|sets|kit|kits)$/;
/** Nouns that only say what a thing is held in or on: "Tote Bag" and "Banner Stand" are totes and banners too. */
const NAME_CONTAINER =
  /^(?:bag|bags|case|cases|holder|holders|stand|stands|pouch|pouches|box|boxes)$/;

/** Lower-cased text reduced to words (letters and digits) joined by single spaces. */
function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join(" ");
}

/** Letters after which a plural takes "es" (glass-es, box-es, watch-es). */
const ES_BASE = /(?:s|x|z|ch|sh)$/;

/**
 * Possible singular forms of one lower-case word, most likely first; empty
 * when it does not look plural. Words of three letters or fewer and words
 * ending in "ss", "us" or "is" are never treated as plurals.
 */
function singularForms(word: string): string[] {
  if (word.length <= 3 || !word.endsWith("s") || /(?:ss|us|is)$/.test(word)) return [];
  const forms: string[] = [];
  if (word.endsWith("ies") && word.length > 4) {
    forms.push(`${word.slice(0, -3)}y`, word.slice(0, -1));
  } else if (word.endsWith("es") && ES_BASE.test(word.slice(0, -2))) {
    forms.push(word.slice(0, -2), word.slice(0, -1));
  } else {
    forms.push(word.slice(0, -1));
  }
  return forms;
}

/** Singular form a haystack word is indexed under (the first of singularForms). */
function indexForm(word: string): string {
  return singularForms(word)[0] ?? word;
}

/**
 * Shopper words mapped to the catalog's words. Each group is a set of phrases
 * that mean the same thing; any phrase in a group also searches the others.
 */
const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ["tshirt", "t shirt", "tee"],
  ["koozie", "coozie", "can cooler", "can sleeve", "can holder"],
  ["beanie", "knit cap", "knit hat"],
  ["tote", "tote bag"],
  ["hoodie", "sweatshirt"],
];

/** Longest synonym phrase, in query tokens. */
const SYNONYM_MAX_TOKENS = 3;

/** Phrase (every word in an accepted spelling) to the other phrases of its group. */
const SYNONYMS: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const group of SYNONYM_GROUPS) {
    for (const phrase of group) {
      const others = group.filter((other) => other !== phrase);
      // key by the phrase as written and with its words singularised, so
      // "totes", "tote bags" and "can coolers" all find their group
      const keys = new Set([phrase, phrase.split(" ").map(indexForm).join(" ")]);
      for (const key of keys) map.set(key, others);
    }
  }
  return map;
})();

/**
 * Searchable text for a product, one normalized field per entry of
 * SEARCH_FIELDS joined by FIELD_SEPARATOR; each field holds its words as
 * written, then (after FORM_SEPARATOR) the same words in singular form.
 * Compute once per product and pass it to matchesQuery / searchProducts.
 */
export function searchHaystack(product: CatalogProduct): string {
  return [
    product.name,
    product.brand,
    product.category,
    (product.colors ?? []).join(" "),
    product.description,
  ]
    .map((text) => {
      const written = normalizeSearchText(text);
      const singular = written.split(" ").map(indexForm).join(" ");
      return singular === written ? written : `${written}${FORM_SEPARATOR}${singular}`;
    })
    .join(FIELD_SEPARATOR);
}

/** One query phrase and the spellings it may be found under (as typed first). */
type Term = readonly string[];
/** A way to read the whole query: every term must match; `penalty` ranks it lower. */
interface Reading {
  terms: Term[];
  penalty: number;
}

function phraseForms(phrase: string): string[] {
  const words = phrase.split(" ");
  const last = words[words.length - 1];
  const forms = [phrase];
  for (const singular of singularForms(last)) {
    forms.push([...words.slice(0, -1), singular].join(" "));
  }
  return forms;
}

/** Every phrase spelled as typed, plus its singular forms, that names a synonym group. */
function synonymsOf(phrase: string): readonly string[] | undefined {
  for (const form of phraseForms(phrase)) {
    const found = SYNONYMS.get(form);
    if (found) return found;
  }
  return undefined;
}

function queryReadings(query: string): Reading[] {
  const tokens = query.split(/\s+/).map(normalizeSearchText).filter(Boolean);
  if (tokens.length === 0) return [];

  // Each slot is a stretch of tokens with its alternatives (typed form first).
  const slots: { options: { term: Term; penalty: number }[] }[] = [];
  for (let i = 0; i < tokens.length;) {
    let consumed = 1;
    let synonyms: readonly string[] | undefined;
    for (let size = Math.min(SYNONYM_MAX_TOKENS, tokens.length - i); size >= 1; size--) {
      synonyms = synonymsOf(tokens.slice(i, i + size).join(" "));
      if (synonyms) {
        consumed = size;
        break;
      }
    }
    const typed = tokens.slice(i, i + consumed).join(" ");
    const options = [{ term: phraseForms(typed), penalty: 0 }];
    for (const synonym of synonyms ?? []) {
      options.push({ term: phraseForms(synonym), penalty: SYNONYM_PENALTY });
    }
    slots.push({ options });
    i += consumed;
  }

  let readings: Reading[] = [{ terms: [], penalty: 0 }];
  for (const slot of slots) {
    readings = readings.flatMap((reading) =>
      slot.options.map((option) => ({
        terms: [...reading.terms, option.term],
        penalty: Math.max(reading.penalty, option.penalty),
      }))
    );
  }
  return readings;
}

/** One searchable text, padded with a space each side for whole-word tests. */
interface Segment {
  padded: string;
  /** Name only: where the product's own description ends (a connector word, or the end). */
  head: number;
  /** Name only: end of the product's noun, the last word of the head that is not filler. */
  nounEnd: number;
  /** Name only: end of the word before a container noun ("Tote" in "Tote Bag"), else -1. */
  typeEnd: number;
}

function toSegment(text: string, isName: boolean): Segment {
  const padded = ` ${text} `;
  if (!isName) return { padded, head: padded.length, nounEnd: -1, typeEnd: -1 };
  const cut = padded.search(NAME_CONNECTOR);
  const head = cut > 0 ? cut : padded.length;
  let nounEnd = -1;
  let typeEnd = -1;
  const words = padded.slice(0, head).trimEnd().split(" ");
  let end = padded.slice(0, head).trimEnd().length;
  for (let i = words.length - 1; i >= 1; i--) {
    if (!NAME_FILLER.test(words[i])) {
      nounEnd = end;
      if (NAME_CONTAINER.test(words[i]) && i > 1) typeEnd = end - words[i].length - 1;
      break;
    }
    end -= words[i].length + 1;
  }
  return { padded, head, nounEnd, typeEnd };
}

/**
 * Rank of a name occurrence: the noun, an earlier word of the head, or past a
 * connector. `index` is where the needle starts; its last character is at
 * index + length - 1 (a space for a whole-word needle).
 */
function namePosition(segment: Segment, index: number, length: number): number {
  if (index >= segment.head) return NAME_TAIL;
  const wordEnd = segment.padded.indexOf(" ", index + length - 1);
  return wordEnd === segment.nounEnd || wordEnd === segment.typeEnd ? NAME_NOUN : NAME_HEAD;
}

/** Score of one form in one segment (lower is better), or null when it is not there. */
function segmentScore(
  segment: Segment,
  form: string,
  substring: boolean,
  isName: boolean
): number | null {
  const kinds = [` ${form} `, ` ${form}`, ...(substring ? [form] : [])];
  for (let kind = 0; kind < kinds.length; kind++) {
    const needle = kinds[kind];
    let index = segment.padded.indexOf(needle);
    if (index < 0) continue;
    if (!isName) return kind * KIND_STEP;
    // the same word can appear in the head and after a connector: keep the best
    let best = NAME_TAIL;
    while (index >= 0 && best > NAME_NOUN) {
      best = Math.min(best, namePosition(segment, index, needle.length));
      index = segment.padded.indexOf(needle, index + 1);
    }
    return kind * KIND_STEP + best;
  }
  return null;
}

/**
 * Rank score of one term in a haystack (lower is better), or null when it is
 * not there. `substring` also accepts a match inside a word.
 */
function termScore(fields: readonly Segment[][], term: Term, substring: boolean): number | null {
  let best: number | null = null;
  let nameScore: number | null = null;
  let categoryScore: number | null = null;
  for (let index = 0; index < fields.length; index++) {
    let fieldBest: number | null = null;
    for (const segment of fields[index]) {
      for (const form of term) {
        const score = segmentScore(segment, form, substring, index === 0);
        if (score !== null && (fieldBest === null || score < fieldBest)) fieldBest = score;
      }
    }
    if (fieldBest === null) continue;
    if (index === 0) nameScore = fieldBest;
    if (index === 2) categoryScore = fieldBest;
    const score = index * FIELD_STEP + fieldBest + (index === 4 ? DESCRIPTION_PENALTY : 0);
    if (best === null || score < best) best = score;
  }
  // the category names what the term is: a name match inside it is the product itself
  if (nameScore !== null && categoryScore !== null && categoryScore < 2 * KIND_STEP) {
    best = (best ?? 0) - CATEGORY_BONUS;
  }
  return best;
}

function parseHaystack(haystack: string): Segment[][] {
  return haystack
    .split(FIELD_SEPARATOR)
    .map((field, index) => field.split(FORM_SEPARATOR).map((text) => toSegment(text, index === 0)));
}

function queryScore(
  fields: readonly Segment[][],
  readings: readonly Reading[],
  substring: boolean
): number | null {
  let best: number | null = null;
  for (const reading of readings) {
    let total = reading.penalty;
    let found = true;
    for (const term of reading.terms) {
      const score = termScore(fields, term, substring);
      if (score === null) {
        found = false;
        break;
      }
      total += score;
    }
    if (found && (best === null || total < best)) best = total;
  }
  return best;
}

/**
 * Every whitespace-separated term must start a word somewhere in the product
 * (AND semantics, case-insensitive; punctuation is ignored, so "t-shirt"
 * finds "T-Shirt"; plurals and a few synonyms also match, see above). An
 * empty query matches everything.
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const readings = queryReadings(query);
  return readings.length === 0 || queryScore(parseHaystack(haystack), readings, false) !== null;
}

/**
 * Filters and ranks `items` for a search query: best field (name, brand,
 * category, color, description) first, then whole word before word prefix,
 * then the input order. Only when no item has a word match at all does it
 * fall back to substring matches, so a short term never drags in unrelated
 * words. An empty query returns the items unchanged.
 */
export function searchProducts<T>(
  items: readonly T[],
  query: string,
  haystackOf: (item: T) => string
): T[] {
  const readings = queryReadings(query);
  if (readings.length === 0) return [...items];
  const parsed = items.map((item) => parseHaystack(haystackOf(item)));
  const rank = (substring: boolean) =>
    items
      .map((item, index) => ({
        item,
        index,
        score: queryScore(parsed[index], readings, substring),
      }))
      .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null)
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map((entry) => entry.item);
  const words = rank(false);
  return words.length > 0 ? words : rank(true);
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

/** Value of the "no filter" choice in the category chips and brand select. */
export const FILTER_ALL = "All";

/** Number of products in each category. */
export function countByCategory(
  products: readonly Pick<CatalogProduct, "category">[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const product of products) counts[product.category] = (counts[product.category] ?? 0) + 1;
  return counts;
}

/** The first `limit` products of every category, keeping the input order. */
export function firstPerCategory<T extends Pick<CatalogProduct, "category">>(
  products: readonly T[],
  limit: number
): T[] {
  const seen: Record<string, number> = {};
  return products.filter((product) => {
    const count = (seen[product.category] ?? 0) + 1;
    seen[product.category] = count;
    return count <= limit;
  });
}

/** Distinct real (name) brands, alphabetical; "Essentials" is left out. */
export function realBrands(products: readonly Pick<CatalogProduct, "brand">[]): string[] {
  return Array.from(new Set(products.map((product) => product.brand)))
    .filter(isRealBrand)
    .sort((a, b) => a.localeCompare(b));
}

export interface CatalogView {
  category: string;
  brand: string;
  query: string;
  sort: SortKey;
  /** Absent means no product filters. */
  filters?: ProductFilters;
}

/**
 * Which categories must be fully loaded before this view can be computed
 * correctly. The server only ships the first cards of each category; with no
 * narrowing the shown cards are exactly those, so nothing more is needed.
 * Searching, brand and product filtering and sorting reorder or drop cards
 * across the whole catalog, so they need every category; focusing a single
 * category (which starts deeper) needs just that one.
 */
export function categoriesNeeded(view: CatalogView, categories: readonly string[]): string[] {
  if (
    view.brand !== FILTER_ALL ||
    view.query !== "" ||
    view.sort !== "featured" ||
    (view.filters !== undefined && hasProductFilters(view.filters))
  ) {
    return [...categories];
  }
  return view.category !== FILTER_ALL ? [view.category] : [];
}
