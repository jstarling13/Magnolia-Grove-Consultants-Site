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

// ---- Tunable rules (change here) -------------------------------------------
/** Vendor quality gate: a row is skipped unless BOTH minimums are met. */
export const MIN_VENDOR_RATING = 4.5;
export const MIN_VENDOR_REVIEWS = 10;
/** Suppliers (ASI numbers) whose data is known to be broken; always skipped. */
export const EXCLUDED_SUPPLIER_ASIS = ["asi/38120"]; // Ball Pro
/** Bayesian vendor score = (rating*reviews + PRIOR_RATING*PRIOR_WEIGHT) / (reviews + PRIOR_WEIGHT). */
export const VENDOR_PRIOR_RATING = 4.0;
export const VENDOR_PRIOR_WEIGHT = 10;
/** Two same-category products are duplicates at or above this token Jaccard. */
export const DUPLICATE_JACCARD = 0.75;
// -----------------------------------------------------------------------------

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
  home: "Home & Decor",
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

// ---- Promo / vendor noise ---------------------------------------------------

/** Words that make "sale" a legitimate part of a product ("Yard Sale Sign"). */
const SALE_GUARD = "(?:yard|garage|bake|estate|rummage|craft|point[- ]of|bill of|for|of|tax)";

/**
 * Phrases that are vendor promotion, not product facts. In a name the phrase
 * is removed; in a description the whole sentence containing it is dropped.
 */
const PROMO_PATTERNS = [
  /\bfixed[\s-]+amount[\s-]+discount\b/i,
  /\b(?:percentage|value)[\s-]+discount(?:[\s-]+on[\s-]+first[\s-]+order)?\b/i,
  /\b\d+(?:\.\d+)?\s*%\s*off\b/i,
  /%\s*off\b/i,
  /\blimited[\s-]+time\b/i,
  /\bfree\s+shipping\b/i,
  /\bclick\s+here\b/i,
  /\bon\s+sale\b/i,
  new RegExp(`(?<!\\b${SALE_GUARD}\\s)\\bsale\\b`, "i"),
];

/** True when the text carries a promo phrase (see PROMO_PATTERNS). */
export function hasPromoText(text) {
  return PROMO_PATTERNS.some((re) => re.test(str(text)));
}

/** Remove stray leading/trailing punctuation and repeated punctuation/spaces. */
export function tidyPunctuation(value) {
  let text = str(value)
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/([!?.,;:])\1+/g, "$1")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/(?:\s[-–—]){2,}(?=\s|$)/g, " -")
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(/^[\s.,;:!\-–—/|&*•]+/, "");
  text = text.replace(/[\s.,;:!\-–—/|&*•]+$/, "");
  return text.trim();
}

/**
 * Product name: whitespace collapsed, promo phrases ("ON SALE!", "% off",
 * "Free shipping", ...) removed, stray punctuation trimmed. (R)/(TM) are kept.
 */
export function cleanName(value) {
  let name = collapseWhitespace(value);
  name = name.replace(
    /\b(?:fixed[\s-]+amount[\s-]+discount|\d+(?:\.\d+)?\s*%\s*off|limited[\s-]+time(?:\s+(?:offer|only|deal))?|free\s+shipping|click\s+here|on\s+sale)\b[\s!.]*/gi,
    " "
  );
  name = name.replace(/%\s*off\b[\s!.]*/gi, " ");
  // bare "Sale": only as a leading/trailing word or shouted ("Sale!"), never mid-name
  name = name.replace(/^sale\b[\s!:\-–—]*/i, "");
  name = name.replace(new RegExp(`(?<!\\b${SALE_GUARD}\\s)\\bsale\\s*!+`, "gi"), " ");
  name = name.replace(
    new RegExp(`(?<!\\b${SALE_GUARD}\\s)[\\s\\-\\u2013\\u2014:|,]*\\bsale\\s*$`, "i"),
    ""
  );
  return tidyPunctuation(name);
}

/** Lowercase ASCII slug, at most `max` chars, no leading/trailing dashes. */
export function slugify(name, max = MAX_SLUG_LENGTH) {
  const slug = str(name)
    .replace(/[\u00ae\u2122\u00a9]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2018\u2019`]/g, "")
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

/** Short real acronyms/codes that stay upper-case inside a shouted color name. */
export const COLOR_ACRONYMS = new Set([
  "UPF",
  "USA",
  "PMS",
  "UV",
  "LED",
  "RFID",
  "GSM",
  "TPU",
  "PVC",
  "USB",
  "ANSI",
  "RPET",
  "NFL",
  "NBA",
  "MLB",
  "NCAA",
  "HD",
  "UPC",
  "SPF",
]);

/**
 * "NAVY BLUE" -> "Navy Blue", "BLACK/WHITE" -> "Black/White". Colors that are
 * not entirely upper-case, or that contain digits (PMS 123, "104"), are left
 * exactly as supplied; known acronyms (UPF, USA, ...) keep their case.
 */
export function titleCaseColor(color) {
  const text = str(color);
  if (/\d/.test(text) || !/[A-Z]/.test(text) || text !== text.toUpperCase()) return text;
  return text.replace(/[A-Za-z][A-Za-z']*/g, (word) =>
    COLOR_ACRONYMS.has(word) ? word : word[0] + word.slice(1).toLowerCase()
  );
}

export function cleanColors(colors) {
  if (!Array.isArray(colors)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of colors) {
    const color = titleCaseColor(
      collapseWhitespace(str(raw).replace(/\s*show\s+(more|less)\s*$/i, ""))
    );
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
const NUM_WORD =
  "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|(?:twenty|thirty|forty|fifty|sixty)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?)";
// "available in 12 colors", "eight attractive colors", "5 colors to choose from"
const COLOR_COUNT_CLAIM = new RegExp(
  `(?:[,;]?\\s*\\b(?:and|or|plus)\\s+)?(?:(?:is|are|comes?|offered|available)\\s+)*(?:in\\s+)?(?:up\\s+to\\s+|over\\s+|more\\s+than\\s+)?\\b${NUM_WORD}[\\s-]+(?:[a-z]+[\\s-]+){0,2}?colou?r(?:way)?s?\\b(?:\\s+(?:available|to\\s+choose\\s+from|options?|choices?|offered))*`,
  "gi"
);
// Imprint/decoration colors are a different fact ("2-color imprint"); leave those sentences alone.
const IMPRINT_CONTEXT =
  /imprint|print|\bink\b|decorat|embroider|screen|logo|artwork|process|stitch/i;

/**
 * Promo labels glued onto the front of a description with no sentence break
 * ("Fixed Amount Discount DC Premium cotton twill cap...") are removed on their
 * own so the real description that follows survives.
 */
export function stripLeadingPromoLabels(text) {
  const label =
    /^(?:fixed[\s-]+amount[\s-]+discount|(?:percentage|value)[\s-]+discount(?:[\s-]+on[\s-]+first[\s-]+order)?|on\s+sale|sale|\d+(?:\.\d+)?\s*%\s*off|limited[\s-]+time(?:\s+(?:offer|only|deal))?|free\s+shipping)\b[\s!:.\-\u2013\u2014]*/i;
  let out = str(text).trim();
  for (let i = 0; i < 4 && label.test(out); i++) {
    const rest = out.replace(label, "").trimStart();
    // a lowercase continuation means the label is part of a sentence
    // ("Free shipping on orders..."): leave it for sentence-level removal
    if (/^[a-z]/.test(rest)) break;
    out = rest;
  }
  return out;
}

/**
 * Description text from the supplier, minus: badge word, promo sentences, and
 * vendor-written color-count claims (the importer states its own accurate
 * color text). Never adds words. Returns "" when nothing meaningful is left.
 */
export function cleanDescriptionText(raw) {
  const text = stripLeadingPromoLabels(stripBadge(raw));
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/);
  const kept = [];
  for (let sentence of sentences) {
    if (hasPromoText(sentence)) continue;
    if (!IMPRINT_CONTEXT.test(sentence)) {
      sentence = sentence.replace(COLOR_COUNT_CLAIM, "\u0001");
    }
    if (sentence.includes("\u0001")) {
      // drop a dangling connector and re-capitalize what follows a removed lead-in
      sentence = sentence
        .replace(/\u0001[\s,;:\-–—]*(?:(?:and|or|plus)\s+)?/g, "\u0001")
        .replace(/^\u0001/, "\u0002")
        .replace(/\u0001/g, " ");
      sentence = tidyPunctuation(sentence);
      sentence = sentence.replace(/^\u0002?\s*([a-z])/, (_, c) => c.toUpperCase());
      sentence = sentence.replace(/\u0002/g, "");
      if (!/[A-Za-z0-9]/.test(sentence)) continue;
      if (!/[.!?)"'”]$/.test(sentence)) sentence += ".";
    }
    kept.push(sentence);
  }
  const joined = kept.join(" ").replace(/\s+/g, " ").trim();
  return /[A-Za-z0-9]/.test(joined) ? tidyPunctuationKeepEnd(joined) : "";
}

/** Like tidyPunctuation but keeps a sentence-ending period/!/?. */
function tidyPunctuationKeepEnd(text) {
  const end = text.match(/[.!?]$/)?.[0] ?? "";
  const body = tidyPunctuation(text.replace(/[.!?]+$/, ""));
  return body ? body + end : "";
}

export function buildDescription({ rawDescription, colorCount, sizes, minQty, usa, multiGrid }) {
  let base = cleanDescriptionText(rawDescription);
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
  const usaFlag = usa === 1 || usa === true || usa === "1";
  // Skip the prefix when the supplier text already says so ("Made in USA.").
  if (usaFlag && !/made\s+in\s+(the\s+)?u\.?s\.?a\b/i.test(base)) {
    sentences.push("Made in the USA.");
  }
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
  "excluded-supplier",
  "low-vendor-rating",
  "malformed-row",
  "unknown-tag",
  "empty-name",
  "name-too-long",
  "no-tiers",
  "price-too-high",
  "no-image",
  "image-failed",
  "duplicate-of-curated",
  "duplicate-same-vendor",
  "duplicate-other-vendor",
  "manual-override",
  "id-collision",
];

// ---- Vendor score -----------------------------------------------------------

/** Bayesian-smoothed vendor rating: few reviews are pulled toward the prior. */
export function vendorScore(rating, reviews) {
  const r = Number(rating);
  const n = Number(reviews);
  if (!Number.isFinite(r) || !Number.isFinite(n) || n < 0) return -Infinity;
  return (r * n + VENDOR_PRIOR_RATING * VENDOR_PRIOR_WEIGHT) / (n + VENDOR_PRIOR_WEIGHT);
}

/** True when the vendor passes the quality gate (rating AND review count). */
export function passesVendorGate(rating, reviews) {
  return Number(rating) >= MIN_VENDOR_RATING && Number(reviews) >= MIN_VENDOR_REVIEWS;
}

/**
 * Ranking comparator: negative when `a` should be kept over `b`.
 * Higher vendor score, more reviews, more colors, lower first-tier price,
 * then lexicographically smaller espId (deterministic).
 * @param {{ vendor: { rating: number, reviews: number }, product: CleanProduct, espId: string }} a
 * @param {{ vendor: { rating: number, reviews: number }, product: CleanProduct, espId: string }} b
 */
export function compareCandidates(a, b) {
  const sa = vendorScore(a.vendor.rating, a.vendor.reviews);
  const sb = vendorScore(b.vendor.rating, b.vendor.reviews);
  if (Math.abs(sa - sb) > 1e-9) return sb - sa;
  if (a.vendor.reviews !== b.vendor.reviews) return b.vendor.reviews - a.vendor.reviews;
  if (a.product.colors.length !== b.product.colors.length) {
    return b.product.colors.length - a.product.colors.length;
  }
  const pa = a.product.tiers[0][1];
  const pb = b.product.tiers[0][1];
  if (pa !== pb) return pa - pb;
  return a.espId < b.espId ? -1 : a.espId > b.espId ? 1 : 0;
}

// ---- Duplicate detection ----------------------------------------------------

/** Marketing filler that never distinguishes one product from another. */
export const NAME_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "with",
  "w",
  "and",
  "for",
  "of",
  "in",
  "new",
  "custom",
  "personalized",
  "promotional",
  "imprinted",
  "logo",
  "branded",
  "popular",
  "premium",
  "quality",
  "best",
  "high",
  "standard",
  "deluxe",
]);

/**
 * Tokens that flip what the product IS (gender, age group, sleeve length...).
 * If two names differ by one of these they are never merged, even when the
 * rest of a long name matches at >= DUPLICATE_JACCARD.
 */
export const DISCRIMINATOR_TOKENS = new Set([
  "men",
  "women",
  "ladies",
  "lady",
  "youth",
  "kid",
  "boy",
  "girl",
  "toddler",
  "infant",
  "short",
  "long",
  "sleeveless",
  "hooded",
  "hoodie",
  "quarter",
  "full",
  "half",
  "mini",
  "jumbo",
]);

/** Light singular stem: shirts -> shirt, batteries -> battery, glasses -> glass. */
export function stemToken(token) {
  if (token.length <= 3) return token;
  if (token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.endsWith("sses")) return token.slice(0, -2);
  if (/(ss|us|is)$/.test(token)) return token;
  if (token.endsWith("s")) return token.slice(0, -1);
  return token;
}

/**
 * Significant-token set for duplicate comparison: lowercase, no (R)/(TM) or
 * punctuation, filler dropped, numbers and units kept (split "16oz" -> "16",
 * "oz" so spacing differences do not matter), light plural stem.
 * @returns {Set<string>}
 */
export function significantTokens(name) {
  const text = str(name)
    .replace(/[®™©]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['‘’`]/g, "")
    .replace(/w\//g, " w ")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const tokens = new Set();
  for (const raw of text.split(" ")) {
    if (!raw || NAME_STOPWORDS.has(raw)) continue;
    const stem = stemToken(raw);
    if (NAME_STOPWORDS.has(stem)) continue;
    tokens.add(stem);
  }
  return tokens;
}

export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of small) if (large.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Same-category duplicate test on two significant-token sets. */
export function isDuplicateTokens(a, b) {
  const min = Math.min(a.size, b.size);
  const max = Math.max(a.size, b.size);
  if (min === 0 || min / max < DUPLICATE_JACCARD) return false; // cannot reach the threshold
  if (jaccard(a, b) < DUPLICATE_JACCARD) return false;
  for (const t of a) if (!b.has(t) && (DISCRIMINATOR_TOKENS.has(t) || /\d/.test(t))) return false;
  for (const t of b) if (!a.has(t) && (DISCRIMINATOR_TOKENS.has(t) || /\d/.test(t))) return false;
  return true;
}

/** True when two product names (same category assumed) are duplicates. */
export function isDuplicateName(nameA, nameB) {
  return isDuplicateTokens(significantTokens(nameA), significantTokens(nameB));
}

/**
 * Clean ONE raw row. Returns { skip: reason } or
 * { product, link, imgId, espId, vendor } (id not yet assigned; see buildCatalog).
 * The vendor gate runs first, before any other check.
 * @param {unknown} row
 * @returns {{ skip: string, product?: undefined } | { skip?: undefined, espId: string, imgId: string, product: CleanProduct, link: EspLink, vendor: { key: string, rating: number, reviews: number } }}
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
    ratingRaw,
    reviewsRaw,
    usaRaw,
    tagRaw,
    multiGridRaw,
  ] = row;

  // 1) vendor quality gate -- before anything else
  const asi = collapseWhitespace(asiRaw);
  if (EXCLUDED_SUPPLIER_ASIS.includes(asi.toLowerCase())) return { skip: "excluded-supplier" };
  const rating = Number(ratingRaw);
  const reviews = Number(reviewsRaw);
  if (!passesVendorGate(rating, reviews)) return { skip: "low-vendor-rating" };

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
    colorCount: Math.min(colors.length, MAX_COLORS),
    sizes: sizesRaw,
    minQty: tiers[0][0],
    usa,
    multiGrid,
  });

  const supplier = collapseWhitespace(supplierRaw);
  return {
    espId,
    imgId,
    vendor: { key: (asi || supplier).toLowerCase(), rating, reviews },
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
      supplier,
      asi,
      productNo: collapseWhitespace(productNoRaw),
    },
  };
}

/**
 * @typedef {{ espId: string, name: string, category: string, supplier: string, asi: string,
 *   rating: number, reviews: number, score: number }} MemberInfo
 */
function memberInfo(c) {
  return {
    espId: c.espId,
    name: c.product.name,
    category: c.product.category,
    supplier: c.link.supplier,
    asi: c.link.asi,
    rating: c.vendor.rating,
    reviews: c.vendor.reviews,
    score: Math.round(vendorScore(c.vendor.rating, c.vendor.reviews) * 1000) / 1000,
  };
}

/**
 * Clean, gate, dedupe and select all raw rows (already concatenated in
 * deterministic order). Pure and deterministic.
 *
 * Order: vendor gate + row quality gates -> drop duplicates of curated items
 * -> cluster the rest (same espId, same supplier+productNo, or same category
 * with token Jaccard >= DUPLICATE_JACCARD) -> keep ONE row per cluster, from
 * the best-scoring vendor. Output keeps raw row order.
 *
 * @param {unknown[]} rows
 * @param {{
 *   curated?: { id: string, name: string, category?: string }[],
 *   curatedNames?: string[], curatedIds?: string[],
 *   rejectedEspIds?: Iterable<string>,
 *   dropEspIds?: { espId: string, reason: string }[],
 *   keepApart?: { espIds: string[], reason?: string }[]
 * }} [opts] `rejectedEspIds`: rows whose image could not be fetched; excluded so a
 *   runner-up from the same cluster is selected instead.
 * @returns {{
 *   items: CatalogItem[],
 *   skipped: Record<string, number>,
 *   skippedDetail: { reason: string, espId?: string, name?: string }[],
 *   clusters: { kept: MemberInfo, dropped: (MemberInfo & { reason: string })[] }[],
 *   curatedDuplicates: { dropped: MemberInfo, curated: string }[],
 *   manualOverrides: { dropped: MemberInfo, reason: string }[]
 * }}
 */
export function buildCatalog(rows, opts = {}) {
  const curated = opts.curated ?? [...(opts.curatedNames ?? []).map((name) => ({ id: "", name }))];
  const curatedIds = [...(opts.curatedIds ?? []), ...curated.map((c) => c.id).filter(Boolean)];
  const curatedNorm = new Set(curated.map((c) => normalizeName(c.name)));
  const curatedTokens = curated
    .filter((c) => c.category)
    .map((c) => ({ ...c, tokens: significantTokens(c.name) }));
  const rejected = new Set(opts.rejectedEspIds ?? []);
  const overrides = new Map((opts.dropEspIds ?? []).map((o) => [String(o.espId).trim(), o.reason]));
  const manualOverrides = [];

  const skipped = {};
  const skippedDetail = [];
  const skip = (reason, extra = {}) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
    skippedDetail.push({ reason, ...extra });
  };

  // ---- 1) per-row cleaning and gates ---------------------------------------
  /** @type {any[]} */
  const candidates = [];
  const curatedDuplicates = [];
  for (const row of rows) {
    const cleaned = cleanRow(row);
    if (cleaned.skip) {
      skip(cleaned.skip, { espId: Array.isArray(row) ? str(row[0]) : undefined });
      continue;
    }
    const detail = { espId: cleaned.espId, name: cleaned.product.name };
    if (rejected.has(cleaned.espId)) {
      skip("image-failed", detail);
      continue;
    }
    // manual overrides (scripts/data/import-overrides.json), after the vendor gate
    if (overrides.has(cleaned.espId)) {
      skip("manual-override", detail);
      manualOverrides.push({ dropped: memberInfo(cleaned), reason: overrides.get(cleaned.espId) });
      continue;
    }
    // ---- 2) duplicates of curated products: curated always wins -------------
    const norm = normalizeName(cleaned.product.name);
    let curatedMatch = curatedNorm.has(norm)
      ? curated.find((c) => normalizeName(c.name) === norm)
      : undefined;
    if (!curatedMatch) {
      const tokens = significantTokens(cleaned.product.name);
      curatedMatch = curatedTokens.find(
        (c) => c.category === cleaned.product.category && isDuplicateTokens(tokens, c.tokens)
      );
    }
    if (curatedMatch) {
      skip("duplicate-of-curated", detail);
      curatedDuplicates.push({ dropped: memberInfo(cleaned), curated: curatedMatch.name });
      continue;
    }
    candidates.push({
      ...cleaned,
      idx: candidates.length,
      tokens: significantTokens(cleaned.product.name),
    });
  }

  // ---- 3) cluster (union-find) -----------------------------------------------
  const parent = candidates.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  // keepApart: espIds that must never share a cluster, whatever route links them
  const apart = new Map(); // espId -> Set of espIds it must stay apart from
  for (const group of opts.keepApart ?? []) {
    const ids = (group.espIds ?? []).map((id) => String(id).trim());
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        if (!apart.has(a)) apart.set(a, new Set());
        apart.get(a).add(b);
      }
    }
  }
  const listed = new Map(); // root -> espIds in that cluster that appear in keepApart
  for (const c of candidates) if (apart.has(c.espId)) listed.set(c.idx, [c.espId]);
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    const la = listed.get(ra) ?? [];
    const lb = listed.get(rb) ?? [];
    for (const x of la) for (const y of lb) if (apart.get(x)?.has(y)) return; // forbidden
    const [lo, hi] = ra < rb ? [ra, rb] : [rb, ra];
    parent[hi] = lo;
    if (la.length + lb.length > 0) {
      listed.set(lo, [...la, ...lb]);
      listed.delete(hi);
    }
  };
  const byEsp = new Map();
  const bySupplierNo = new Map();
  const byCategory = new Map();
  for (const c of candidates) {
    if (byEsp.has(c.espId)) union(c.idx, byEsp.get(c.espId));
    else byEsp.set(c.espId, c.idx);
    if (c.link.supplier && c.link.productNo) {
      const key = `${c.link.supplier.toLowerCase()}|${c.link.productNo.toLowerCase()}`;
      if (bySupplierNo.has(key)) union(c.idx, bySupplierNo.get(key));
      else bySupplierNo.set(key, c.idx);
    }
    const cat = c.product.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(c);
  }
  for (const list of byCategory.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (
          find(list[i].idx) !== find(list[j].idx) &&
          isDuplicateTokens(list[i].tokens, list[j].tokens)
        ) {
          union(list[i].idx, list[j].idx);
        }
      }
    }
  }

  const clusterMap = new Map();
  for (const c of candidates) {
    const root = find(c.idx);
    if (!clusterMap.has(root)) clusterMap.set(root, []);
    clusterMap.get(root).push(c);
  }

  // ---- 4) keep exactly one row per cluster ------------------------------------
  const winners = [];
  const clusters = [];
  for (const members of clusterMap.values()) {
    const ranked = [...members].sort(compareCandidates);
    const winner = ranked[0];
    winners.push(winner);
    if (members.length > 1) {
      const dropped = ranked.slice(1).map((m) => {
        const sameVendor = m.vendor.key === winner.vendor.key;
        const reason = sameVendor ? "duplicate-same-vendor" : "duplicate-other-vendor";
        skip(reason, { espId: m.espId, name: m.product.name });
        return { ...memberInfo(m), reason };
      });
      clusters.push({ kept: memberInfo(winner), dropped });
    }
  }
  winners.sort((a, b) => a.idx - b.idx);
  clusters.sort((a, b) => (a.kept.name < b.kept.name ? -1 : a.kept.name > b.kept.name ? 1 : 0));

  // ---- 5) ids ---------------------------------------------------------------
  const taken = new Map(curatedIds.map((id) => [id, ""]));
  const items = [];
  for (const w of winners) {
    const id = makeUniqueId(w.product.name, w.espId, taken);
    if (!id) {
      skip("id-collision", { espId: w.espId, name: w.product.name });
      continue;
    }
    taken.set(id, w.espId);
    items.push({ id, imgId: w.imgId, product: w.product, link: w.link });
  }

  return { items, skipped, skippedDetail, clusters, curatedDuplicates, manualOverrides };
}

// ---- Manual overrides / safety checks ---------------------------------------

/**
 * Validate scripts/data/import-overrides.json content. Each entry needs a
 * string espId and a non-empty reason; keepEspId / keepCuratedId optionally name
 * the replacement that makes dropping the row safe (verified by checkOverrides).
 * @returns {{ espId: string, reason: string, keepEspId?: string, keepCuratedId?: string }[]}
 */
export function parseOverrides(json) {
  const list = json?.dropEspIds ?? [];
  if (!Array.isArray(list)) throw new Error("import-overrides.json: dropEspIds must be an array");
  const seen = new Set();
  return list.map((entry, i) => {
    const espId = collapseWhitespace(entry?.espId);
    const reason = collapseWhitespace(entry?.reason);
    if (!espId) throw new Error(`import-overrides.json: dropEspIds[${i}] has no espId`);
    if (!reason)
      throw new Error(`import-overrides.json: dropEspIds[${i}] (${espId}) has no reason`);
    if (seen.has(espId)) throw new Error(`import-overrides.json: duplicate espId ${espId}`);
    seen.add(espId);
    const out = { espId, reason };
    if (entry.keepEspId) out.keepEspId = collapseWhitespace(entry.keepEspId);
    if (entry.keepCuratedId) out.keepCuratedId = collapseWhitespace(entry.keepCuratedId);
    return out;
  });
}

/**
 * Validate the keepApart section of import-overrides.json: each group needs at
 * least two distinct espIds and a reason.
 * @returns {{ espIds: string[], reason: string }[]}
 */
export function parseKeepApart(json) {
  const list = json?.keepApart ?? [];
  if (!Array.isArray(list)) throw new Error("import-overrides.json: keepApart must be an array");
  return list.map((entry, i) => {
    const espIds = [...new Set((entry?.espIds ?? []).map((id) => collapseWhitespace(id)))].filter(
      Boolean
    );
    const reason = collapseWhitespace(entry?.reason);
    if (espIds.length < 2) {
      throw new Error(`import-overrides.json: keepApart[${i}] needs at least two distinct espIds`);
    }
    if (!reason) throw new Error(`import-overrides.json: keepApart[${i}] has no reason`);
    return { espIds, reason };
  });
}

/** Warn about keepApart espIds that appear in no raw file (stale entries). */
export function checkKeepApart({ keepApart, rawEspIds }) {
  const raw = new Set(rawEspIds);
  const warnings = [];
  for (const group of keepApart) {
    for (const id of group.espIds) {
      if (!raw.has(id)) {
        warnings.push(
          `stale keepApart: espId ${id} is not present in any raw file (${group.reason})`
        );
      }
    }
  }
  return warnings;
}

/**
 * Warnings (never silent data loss): an override whose espId is in no raw file
 * is stale; one whose declared replacement is not actually in the catalog would
 * leave the product with no listing at all.
 */
export function checkOverrides({ overrides, rawEspIds, selectedEspIds, curatedIds }) {
  const raw = new Set(rawEspIds);
  const selected = new Set(selectedEspIds);
  const curated = new Set(curatedIds);
  const warnings = [];
  for (const o of overrides) {
    if (!raw.has(o.espId)) {
      warnings.push(
        `stale override: espId ${o.espId} is not present in any raw file (${o.reason})`
      );
      continue;
    }
    if (!o.keepEspId && !o.keepCuratedId) {
      warnings.push(`override ${o.espId} names no replacement (keepEspId / keepCuratedId)`);
    }
    if (o.keepEspId && !selected.has(o.keepEspId)) {
      warnings.push(
        `override ${o.espId}: replacement espId ${o.keepEspId} is NOT in the imported catalog`
      );
    }
    if (o.keepCuratedId && !curated.has(o.keepCuratedId)) {
      warnings.push(
        `override ${o.espId}: replacement curated product ${o.keepCuratedId} does not exist`
      );
    }
  }
  return warnings;
}

/**
 * Products that carry hand-sourced data (color photos, ESP links) must keep
 * their id across imports. Returns the protected ids that were selected last
 * time but are gone now.
 */
export function findLostProtectedIds({ previousIds, selectedIds, protectedIds }) {
  const selected = new Set(selectedIds);
  const protectedSet = new Set(protectedIds);
  return [...new Set(previousIds)].filter((id) => protectedSet.has(id) && !selected.has(id)).sort();
}

/**
 * Rename colorImages keys that cleanup changed ("BLACK" -> "Black") so photos
 * keep mapping. Only keys move; values are never touched.
 * @param {Record<string, Record<string, string>>} colorImages
 * @param {{ id: string, colors: string[] }[]} records imported records
 * @returns {{ colorImages: Record<string, Record<string, string>>, renamed: number, unresolved: string[] }}
 */
export function renameColorImageKeys(colorImages, records) {
  const byId = new Map(records.map((r) => [r.id, r.colors]));
  const next = {};
  let renamed = 0;
  const unresolved = [];
  for (const [id, byColor] of Object.entries(colorImages)) {
    const colors = byId.get(id);
    if (!colors) {
      next[id] = byColor; // curated product: not ours to touch
      continue;
    }
    const valid = new Set(colors);
    const out = {};
    for (const [color, src] of Object.entries(byColor)) {
      if (valid.has(color)) {
        out[color] = src;
        continue;
      }
      const candidate = cleanColors([color])[0];
      if (candidate && valid.has(candidate) && !(candidate in byColor) && !(candidate in out)) {
        out[candidate] = src;
        renamed++;
      } else {
        unresolved.push(`${id}: "${color}"`);
        out[color] = src;
      }
    }
    next[id] = out;
  }
  return { colorImages: next, renamed, unresolved };
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
