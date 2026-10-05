/**
 * Pure cleaning / dedupe logic for the bulk ESP+ catalog import.
 *
 * No file or network access lives here so every rule can be unit-tested
 * (see __tests__/catalogImport.test.ts). Raw rows are positional arrays:
 *
 *  [0] espId  [1] productNo  [2] name  [3] description  [4] colors[]
 *  [5] sizes  [6] tiers [[qty, catalogPrice], ...]  [7] imgId  [8] supplier
 *  [9] asi    [10] supplierRating  [11] supplierReviews  [12] usa(0/1)
 *  [13] tag   [14] multiGrid(0/1, may be missing)
 *
 * Only ESP "Catalog Price" tiers are ever read; nothing here invents data.
 */

/**
 * @typedef {{ name: string, category: string, brand: string, description: string,
 *   tiers: [number, number][], imageAlt: string, colors: string[] }} CleanProduct
 * @typedef {{ espId: string, supplier: string, asi: string, productNo: string }} EspLink
 * @typedef {{ id: string, imgId: string, product: CleanProduct, link: EspLink }} CatalogItem
 */

export const MAX_NAME_LENGTH = 140;
export const MAX_TIER_PRICE = 3000;
export const MAX_COLORS = 30;
export const MAX_TIERS = 5;
export const MAX_SLUG_LENGTH = 60;

/** Raw scraper tag (incl. legacy tags) -> site category. */
export const TAG_TO_CATEGORY = {
  apparel: "Apparel",
  headwear: "Headwear",
  drinkware: "Drinkware",
  bags: "Bags",
  tech: "Tech Accessories",
  office: "Office & Writing",
  event: "Event & Signage",
  gifts: "Gifts & Entertaining",
  tools: "Knives & Tools",
  outdoor: "Outdoor & Sports",
  wellness: "Health & Wellness",
  // legacy tags from the first scrape batch
  umbrellas: "Outdoor & Sports",
  golf: "Outdoor & Sports",
  polo: "Apparel",
};

/**
 * Recognizable brands matched (case-insensitive, word-boundary) against the
 * START of a product name. Value is the canonical display form. Matching is
 * longest-first so "Port Authority" wins over a hypothetical shorter prefix.
 */
export const BRANDS = [
  "Port Authority",
  "Sport-Tek",
  "Gildan",
  "Bella+Canvas",
  "Comfort Colors",
  "Hanes",
  "Jerzees",
  "Next Level",
  "Champion",
  "Nike",
  "Adidas",
  "Under Armour",
  "Columbia",
  "Carhartt",
  "The North Face",
  "Eddie Bauer",
  "Cutter & Buck",
  "Callaway",
  "Titleist",
  "Stanley",
  "YETI",
  "Hydro Flask",
  "Contigo",
  "Thermos",
  "Koozie",
  "BIC",
  "Cross",
  "Parker",
  "Zippo",
  "Leatherman",
  "Buck",
  "Pelican",
  "Igloo",
  "Coleman",
  "Anker",
  "Samsonite",
  "Fossil",
  "Wilson",
  "Spalding",
  "Lifeguard",
  // brands already used by the curated catalog
  "Peter Millar",
  "Holderness & Bourne",
  "Brooks Brothers",
  "Storm Creek",
  "Johnnie-O",
  "Owala",
  "Imperial",
  "Puma",
  "OGIO",
  "Travis Mathew",
  "Zero Restriction",
  "Antigua",
  "Devon & Jones",
  "Richardson",
  "Patagonia",
  "Helly Hansen",
  "Marmot",
  "Rawlings",
  "Easton",
  "Sharpie",
  "Paper Mate",
  "Moleskine",
  "Bose",
  "JBL",
  "Sony",
  "Fitbit",
  "Garmin",
  "Gerber",
  "Swiss Army",
  "Victorinox",
  "Weber",
  "Ping",
  "Bag Boy",
  "Sun Mountain",
  "New Era",
  "Flexfit",
  "Yupoong",
  "Otto",
  "Port & Company",
  "Allmade",
  "Russell Athletic",
  "Augusta Sportswear",
  "Badger",
  "Tommy Bahama",
  "TaylorMade",
  "Srixon",
  "Bridgestone",
  "Volvik",
  "Kate Spade",
  "Vera Bradley",
  "Fjallraven",
  "Osprey",
  "Timbuk2",
  "High Sierra",
  "Swissgear",
  "Targus",
  "Case Logic",
  "Camelbak",
  "Klean Kanteen",
  "Simple Modern",
  "RTIC",
  "Tervis",
  "Corkcicle",
  "Rubbermaid",
  "Bubba",
  "Hamilton Beach",
  "Cuisinart",
  "Rada",
  "Wusthof",
  "Gillette",
  "Duracell",
  "Energizer",
].filter((b, i, arr) => arr.indexOf(b) === i);

// Longest names first; precompiled matchers. Spaces in a brand match any run of
// whitespace/hyphen so "Sport Tek" and "Sport-Tek" both hit.
const BRAND_MATCHERS = [...BRANDS]
  .sort((a, b) => b.length - a.length)
  .map((brand) => {
    const body = brand
      .split(/[\s-]+/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[\\s-]+");
    return { brand, re: new RegExp(`^${body}(?![A-Za-z0-9])`, "i") };
  });

/**
 * Brands that are also ordinary product words: reject the match when the very
 * next word is one of these ("Cross Body Bag" is not a Cross pen; "Ping Pong
 * Set" is not a Ping club). Compared lowercase.
 */
export const BRAND_EXCLUDE_NEXT = {
  Cross: [
    "body",
    "over",
    "fit",
    "stitch",
    "back",
    "section",
    "country",
    "bag",
    "bags",
    "trainer",
    "walk",
    "word",
    "check",
    "hatch",
    "grain",
    "bow",
    "bones",
    "shaped",
    "stitched",
  ],
  Ping: ["pong"],
  Buck: ["et", "wheat", "skin"],
  Champion: ["ship", "ships"],
};

export const DEFAULT_BRAND = "Essentials";

const BADGE_RE =
  /^(?:trending|new(?!\s+(?:era|balance|york|england|jersey|orleans)\b)|popular|hot|best[\s-]*seller)(?:\s+|\s*[:|\u00b7\u2022\-\u2013\u2014]\s*)/i;
// Badge words glued straight onto a capitalised sentence ("TrendingA durable...").
const GLUED_BADGE_RE = /^(?:[Tt]rending|[Pp]opular|[Bb]est[\s-]*[Ss]eller)(?=[A-Z])/;

/** @param {unknown} value */
function str(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

/** Collapse all whitespace runs to single spaces and trim. */
export function collapseWhitespace(value) {
  return str(value).replace(/\s+/g, " ").trim();
}

export function cleanName(value) {
  return collapseWhitespace(value);
}

/** Lowercase ASCII slug, at most `max` chars, no leading/trailing dashes. */
export function slugify(name, max = MAX_SLUG_LENGTH) {
  const slug = str(name)
    .replace(/[\u00ae\u2122\u00a9]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || "product";
}

/** Last `n` digits of an ESP id (zero-padded); null when the id has no digits. */
export function idSuffix(espId, n = 5) {
  const digits = str(espId).replace(/\D/g, "");
  if (!digits) return null;
  return digits.slice(-n).padStart(n, "0");
}

/**
 * Stable, globally unique id. Normally `<slug>-<last5(espId)>`; on a collision
 * with a different product (or a curated id) it widens the numeric suffix, so
 * the result is deterministic for a given input order.
 *
 * @param {string} name
 * @param {string} espId
 * @param {Map<string,string>} taken  id -> espId owning it ("" for curated ids)
 */
export function makeUniqueId(name, espId, taken) {
  const slug = slugify(name);
  const digits = str(espId).replace(/\D/g, "");
  const candidates = [5, 8, 12].map((n) => `${slug}-${idSuffix(espId, n)}`);
  candidates.push(`${slug}-${digits}`);
  for (const id of candidates) {
    const owner = taken.get(id);
    if (owner === undefined || owner === espId) return id;
  }
  return null;
}

/** Strip leading badge words ("Trending", "New", ...) from a description. */
export function stripBadge(description) {
  let text = str(description).trim();
  for (let i = 0; i < 3; i++) {
    const before = text;
    text = text.replace(BADGE_RE, "").replace(GLUED_BADGE_RE, "").trimStart();
    if (text === before) break;
  }
  return collapseWhitespace(text);
}

export function cleanColors(colors) {
  if (!Array.isArray(colors)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of colors) {
    const color = collapseWhitespace(str(raw).replace(/\s*show\s+(more|less)\s*$/i, ""));
    if (!color) continue;
    const key = color.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(color);
  }
  return out;
}

/**
 * Sort ascending by quantity, dedupe quantities (first occurrence wins),
 * drop non-positive quantities/prices, keep at most MAX_TIERS.
 * Returns [[qty, price], ...] with raw ESP catalog prices (no markup).
 */
export function cleanTiers(tiers) {
  if (!Array.isArray(tiers)) return [];
  const valid = [];
  for (const entry of tiers) {
    if (!Array.isArray(entry)) continue;
    const qty = Number(entry[0]);
    const price = Number(entry[1]);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) continue;
    if (!Number.isInteger(qty) || qty <= 0 || price <= 0) continue;
    valid.push([qty, price]);
  }
  valid.sort((a, b) => a[0] - b[0]); // stable: ties keep raw order
  const out = [];
  const seen = new Set();
  for (const tier of valid) {
    if (seen.has(tier[0])) continue;
    seen.add(tier[0]);
    out.push(tier);
  }
  return out.slice(0, MAX_TIERS);
}

/** Detect a recognizable brand at the start of the name; "Essentials" if none. */
export function detectBrand(name) {
  const text = collapseWhitespace(name).replace(/^[\u00ae\u2122\s]+/, "");
  for (const { brand, re } of BRAND_MATCHERS) {
    const match = re.exec(text);
    if (!match) continue;
    const exclude = BRAND_EXCLUDE_NEXT[brand];
    if (exclude) {
      const next =
        text
          .slice(match[0].length)
          .trim()
          .split(/[\s-]+/)[0]
          ?.toLowerCase() ?? "";
      if (exclude.includes(next)) continue;
    }
    return brand;
  }
  return DEFAULT_BRAND;
}

/** Lowercase, strip punctuation/(R)/(TM), collapse spaces: used for dedupe. */
export function normalizeName(name) {
  return str(name)
    .replace(/[\u00ae\u2122\u00a9]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapCategory(tag) {
  return TAG_TO_CATEGORY[str(tag).trim().toLowerCase()] ?? null;
}

/**
 * Description: raw text minus badge word, or a factual fallback built only
 * from the row's own color count and sizes. Always ends with the "Priced at"
 * sentence matching the curated style.
 */
export function buildDescription({ rawDescription, colorCount, sizes, minQty, usa, multiGrid }) {
  let base = stripBadge(rawDescription);
  if (!base) {
    const parts = [];
    if (colorCount > 0) parts.push(`${colorCount} color option${colorCount === 1 ? "" : "s"}.`);
    const size = collapseWhitespace(sizes);
    if (size) parts.push(`Size: ${size}.`);
    base = parts.join(" ");
  } else if (!/[.!?)"'”]$/.test(base)) {
    base += ".";
  }
  const sentences = [];
  if (usa === 1 || usa === true || usa === "1") sentences.push("Made in the USA.");
  if (base) sentences.push(base);
  if (multiGrid === 1 || multiGrid === true || multiGrid === "1") {
    sentences.push(
      "Pricing shown is for the base size or option; other sizes or options may cost more."
    );
  }
  sentences.push(`Priced at ${minQty} unit${minQty === 1 ? "" : "s"}.`);
  return sentences.join(" ");
}

export const SKIP_REASONS = [
  "malformed-row",
  "unknown-tag",
  "empty-name",
  "name-too-long",
  "no-tiers",
  "price-too-high",
  "no-image",
  "duplicate-espid",
  "duplicate-supplier-productno",
  "duplicate-of-curated",
  "id-collision",
  "image-failed",
];

/**
 * Clean ONE raw row. Returns { skip: reason } or
 * { product, link, imgId, espId } (id not yet assigned; see buildCatalog).
 * @param {unknown} row
 * @returns {{ skip: string, product?: undefined } | { skip?: undefined, espId: string, imgId: string, product: CleanProduct, link: EspLink }}
 */
export function cleanRow(row) {
  if (!Array.isArray(row)) return { skip: "malformed-row" };
  const [
    espIdRaw,
    productNoRaw,
    nameRaw,
    descRaw,
    colorsRaw,
    sizesRaw,
    tiersRaw,
    imgIdRaw,
    supplierRaw,
    asiRaw,
    ,
    ,
    usaRaw,
    tagRaw,
    multiGridRaw,
  ] = row;

  const espId = collapseWhitespace(espIdRaw);
  if (!espId || idSuffix(espId) === null) return { skip: "malformed-row" };

  const category = mapCategory(tagRaw);
  if (!category) return { skip: "unknown-tag" };

  const name = cleanName(nameRaw);
  if (!name) return { skip: "empty-name" };
  if (name.length > MAX_NAME_LENGTH) return { skip: "name-too-long" };

  const allPrices = Array.isArray(tiersRaw)
    ? tiersRaw.map((t) => (Array.isArray(t) ? Number(t[1]) : NaN))
    : [];
  if (allPrices.some((p) => Number.isFinite(p) && p > MAX_TIER_PRICE)) {
    return { skip: "price-too-high" };
  }
  const tiers = cleanTiers(tiersRaw);
  if (tiers.length === 0) return { skip: "no-tiers" };

  const imgId = collapseWhitespace(imgIdRaw);
  if (!/^\d+$/.test(imgId)) return { skip: "no-image" };

  const colors = cleanColors(colorsRaw);
  const usa = Number(usaRaw) === 1 ? 1 : 0;
  const multiGrid = Number(multiGridRaw) === 1 ? 1 : 0;

  const description = buildDescription({
    rawDescription: descRaw,
    colorCount: colors.length,
    sizes: sizesRaw,
    minQty: tiers[0][0],
    usa,
    multiGrid,
  });

  return {
    espId,
    imgId,
    product: {
      name,
      category,
      brand: detectBrand(name),
      description,
      tiers,
      imageAlt: name,
      colors: colors.slice(0, MAX_COLORS),
    },
    link: {
      espId,
      supplier: collapseWhitespace(supplierRaw),
      asi: collapseWhitespace(asiRaw),
      productNo: collapseWhitespace(productNoRaw),
    },
  };
}

/**
 * Clean, validate and dedupe all raw rows (already concatenated in
 * deterministic order). Pure and deterministic.
 *
 * @param {unknown[]} rows
 * @param {{ curatedNames?: string[], curatedIds?: string[] }} [opts]
 * @returns {{
 *   items: CatalogItem[],
 *   skipped: Record<string, number>,
 *   skippedDetail: { reason: string, espId?: string, name?: string }[]
 * }}
 */
export function buildCatalog(rows, opts = {}) {
  const curatedNames = new Set((opts.curatedNames ?? []).map(normalizeName));
  const taken = new Map((opts.curatedIds ?? []).map((id) => [id, ""]));
  const seenEsp = new Set();
  const seenSupplierNo = new Set();
  const items = [];
  const skipped = {};
  const skippedDetail = [];

  const skip = (reason, extra = {}) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
    skippedDetail.push({ reason, ...extra });
  };

  for (const row of rows) {
    const cleaned = cleanRow(row);
    if (cleaned.skip) {
      skip(cleaned.skip, { espId: Array.isArray(row) ? str(row[0]) : undefined });
      continue;
    }
    const { espId, imgId, product, link } = cleaned;
    const detail = { espId, name: product.name };

    if (seenEsp.has(espId)) {
      skip("duplicate-espid", detail);
      continue;
    }
    const supplierKey =
      link.supplier && link.productNo
        ? `${link.supplier.toLowerCase()}|${link.productNo.toLowerCase()}`
        : null;
    if (supplierKey && seenSupplierNo.has(supplierKey)) {
      skip("duplicate-supplier-productno", detail);
      continue;
    }
    if (curatedNames.has(normalizeName(product.name))) {
      skip("duplicate-of-curated", detail);
      continue;
    }
    const id = makeUniqueId(product.name, espId, taken);
    if (!id) {
      skip("id-collision", detail);
      continue;
    }

    seenEsp.add(espId);
    if (supplierKey) seenSupplierNo.add(supplierKey);
    taken.set(id, espId);
    items.push({ id, imgId, product, link });
  }

  return { items, skipped, skippedDetail };
}

/**
 * Shape the browser-safe record written to importedProducts.json.
 * Deliberately contains NO espId / supplier / asi / productNo.
 */
/** @param {{ id: string, product: CleanProduct }} item */
export function toPublicRecord({ id, product }) {
  return {
    id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    description: product.description,
    tiers: product.tiers,
    image: `/images/merch/${id}.webp`,
    imageAlt: product.imageAlt,
    colors: product.colors,
  };
}
