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
 *   tiers: [number, number][], imageAlt: string, colors: string[], priceNote?: string }} CleanProduct
 * @typedef {{ espId: string, supplier: string, asi: string, productNo: string }} EspLink
 * @typedef {{ rating: number, reviews: number, key: string }} Vendor
 * @typedef {{ id: string, imgId: string, product: CleanProduct, link: EspLink, vendor: Vendor, colorMap: Record<string, string | null> }} CatalogItem
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
/**
 * Looser threshold used ONLY between rows from different suppliers in the same category:
 * two vendors listing "RTIC 20oz Essential Tumbler" and "RTIC Ceramic Lined 20 oz Essential
 * Tumbler" are one product, even though the names do not reach DUPLICATE_JACCARD. The same
 * discriminator guards apply, plus shape words and a size-conflict check (see isNearDuplicate).
 */
export const NEAR_DUPLICATE_JACCARD = 0.65;
/** Shown on a product page when the one price grid we hold is for a base size. */
export const PRICE_NOTE_SIZE = "Priced for the standard size; other sizes quoted on request.";
// -----------------------------------------------------------------------------

export const MAX_NAME_LENGTH = 140;
/** Imported products whose smallest tier quantity exceeds this are dropped ("moq-too-high"). */
export const MAX_MIN_QUANTITY = 1000;
/** Imported products whose first-tier unit price exceeds this are dropped ("price-too-high"). */
export const MAX_FIRST_TIER_PRICE = 1500;
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
  food: "Food & Treats",
  auto: "Automotive",
  seasonal: "Seasonal & Holiday",
  kids: "Kids & Toys",
  awards: "Awards & Recognition",
  print: "Print & Collateral",
  // Newer scrapes can tag these directly; the importer also assigns them with CATEGORY_RULES.
  giveaway: "Promo Giveaways",
  badges: "Lanyards & Badges",
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
  "Titus",
  "Cayak",
  "Branded Bills",
  "WaterHog",
  "WaterH",
  "Cedar Creek",
  "Scosche",
  "S'well",
  "Sportsman",
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
  // named brands that used to fall through to "Essentials"
  "Apple",
  "Beats",
  "Hershey",
  "Snickers",
  "Payday",
  "M&M's",
  "Mike and Ike",
  "Waterman",
  "Kershaw",
  "Maglite",
  "Opinel",
  "Perry Ellis",
  "Native Union",
  "Toasteez",
  "Grosche",
  "Hydrapeak",
  "Himalayan",
  "Intrepid",
  "Free Fly",
  "Vynex",
  "Frame-It",
  "OtterBox",
  "Red Cup Living",
  "Kool Pak",
  "Kan-Tastic",
  "CORE365",
  "Team 365",
  "J America",
  "Alternative",
  "Wyld Gear",
].filter((b, i, arr) => arr.indexOf(b) === i);

// Longest names first; precompiled matchers. Spaces in a brand match any run of
// whitespace/hyphen so "Sport Tek" and "Sport-Tek" both hit.
/**
 * Brands that are also ordinary words or surnames. These only count when the
 * name STARTS with them; every other brand is also found within the first
 * BRAND_WINDOW words ("20 oz Owala FreeSip", "3x10 WaterHog Classic Mat").
 */
export const START_ONLY_BRANDS = new Set([
  "Cross",
  "Buck",
  "Parker",
  "Stanley",
  "Wilson",
  "Fossil",
  "Columbia",
  "Champion",
  "Koozie",
  "Pelican",
  "Imperial",
  "Ping",
  "Otto",
  "Next Level",
  "Lifeguard",
  "Badger",
  "Marmot",
  "Osprey",
  "Gerber",
  "Antigua",
  "Simple Modern",
  "Weber",
  "Easton",
  "Sportsman",
  "Zero Restriction",
  "Alternative",
  "J America",
  "Team 365",
  "Free Fly",
]);
/** How many leading words of a name may contain a (non start-only) brand. */
export const BRAND_WINDOW = 5;

/** Brands whose written form varies ("Bella + Canvas", "Bella Canvas", "Bella+Canvas"). */
const BRAND_PATTERNS = {
  // "Bella + Canvas", "Bella Canvas", "BELLA+CANVAS" and the short "Bella Women's ..." form
  "Bella+Canvas": "Bella(?:\\s*\\+\\s*|\\s+)Canvas|Bella(?=\\s+(?:women|men|youth|unisex|toddler|baby)\\b)",
  // only the consumer-electronics products, never "Apple Cider Mix" or an apple-shaped item
  Apple: "Apple(?=\\s+(?:air\\s?pods?|watch|i?pad|i?phone|mac\\s?book|air\\s?tag)\\b)",
  Beats: "Beats(?=\\s+(?:by\\s+dr\\.?\\s*dre|solo|studio|fit|flex|pill)\\b)",
  "Mike and Ike": "Mike[\\s-]+and[\\s-]+Ikes?",
  "M&M's": "M\\s*&\\s*M['\u2019]?s",
  Hershey: "Hershey(?:['\u2019]s)?",
  "Perry Ellis": "Perry[\\s-]+Ellis",
  // "Alternative 3/4-Sleeve Raglan Henley", "Alternative Eco-Jersey ...", never "Alternative Fuel"
  Alternative: "Alternative(?=\\s+(?:apparel\\b|eco\\b|\\d))",
};

const BRAND_MATCHERS = [...BRANDS]
  .sort((a, b) => b.length - a.length)
  .map((brand) => {
    const body =
      BRAND_PATTERNS[brand] ??
      brand
        .split(/[\s-]+/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['\u2019]"))
        .join("[\\s-]+");
    return { brand, re: new RegExp(`^(?:${body})(?![A-Za-z0-9])`, "i") };
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
  /\bclose[\s-]?out\b/i,
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

/**
 * Normalize measurement spacing: no space before inch/foot marks, one space
 * around "x" between measurements. "6 ' x 10 ''" -> "6' x 10''",
 * "4'x 6'" -> "4' x 6'", "32" X 20"" -> "32" x 20"". Digits-only "4x6" is left alone.
 */
export function normalizeMeasurements(value) {
  return str(value)
    .replace(/(\d)\s+(['"′″])/g, "$1$2")
    .replace(/(\d\s*['"′″]+)\s*[xX×]\s*(?=\d)/g, "$1 x ")
    .replace(/(\d)\s+[xX×]\s+(?=\d)/g, "$1 x ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop unmatched ")" and "(" characters ("Logo Mat )4'x8')" -> "Logo Mat 4'x8'"). */
export function dropUnbalancedParens(value) {
  const chars = [...str(value)];
  const open = [];
  const drop = new Set();
  chars.forEach((ch, i) => {
    if (ch === "(") open.push(i);
    else if (ch === ")") {
      if (open.length) open.pop();
      else drop.add(i);
    }
  });
  for (const i of open) drop.add(i);
  return chars.map((ch, i) => (drop.has(i) ? " " : ch)).join("");
}

/**
 * Display name: starts from the id-safe cleanName() and additionally removes
 * vendor/ops text (MOQ, Rush Service, "(1 Imprint)", "- Custom Imprint"),
 * balances parentheses, normalizes measurement spacing and "oz" casing, and
 * capitalizes a lowercase first letter. NEVER used to derive ids.
 */
export function cleanDisplayName(value) {
  let name = cleanName(value);
  name = name.replace(/\bMOQ[\s:.-]*\d[\d,]*\s*(?:pcs?|pieces?|units?|pk|sets?)?\b\.?/gi, " ");
  name = name.replace(/\brush[\s-]+(?:service|production|order)\b/gi, " ");
  name = name.replace(/^rush\s*[-–—:]\s*/i, "");
  name = name.replace(/\(\s*\d+\s*(?:color\s+)?imprints?\s*\)/gi, " ");
  name = name.replace(/\s*[-–—,:]\s*custom\s+imprint(?:ed)?\s*$/i, "");
  name = dropUnbalancedParens(name);
  name = normalizeMeasurements(name);
  name = name.replace(/(\d)(\s*)oz\b/gi, "$1$2oz");
  name = tidyPunctuation(name);
  name = name.replace(/^[a-z]/, (c) => c.toUpperCase());
  return name;
}

// ---- Name casing ----------------------------------------------------------------

/** Share of letters in the name that are upper case (0 when there are none). */
export function uppercaseRatio(name) {
  const letters = str(name).replace(/[^A-Za-z]/g, "");
  if (letters.length === 0) return 0;
  return letters.replace(/[^A-Z]/g, "").length / letters.length;
}

/** A name set mostly in capitals ("LANYARDS DYE SUBLIMATED FULL COLOR"): over 70% of its letters. */
export const SHOUTY_RATIO = 0.7;
export function isShoutyName(name) {
  return str(name).replace(/[^A-Za-z]/g, "").length >= 5 && uppercaseRatio(name) > SHOUTY_RATIO;
}

/** Real acronyms that stay upper case when a shouted name is converted to Title Case. */
export const NAME_ACRONYMS = new Set([
  "USB",
  "LED",
  "UV",
  "PVC",
  "UPF",
  "GSM",
  "ANSI",
  "USA",
  "NFC",
  "RFID",
  "HD",
  "ID",
  "CVC",
  "UL",
  "AA",
  "AAA",
  "PU",
  "PP",
  "ABS",
  "EVA",
  "PET",
  "RPET",
  "QR",
  "LCD",
  "GPS",
  "SPF",
  "FM",
  "BBQ",
  "DIY",
  "TV",
  "RTIC",
  "YETI",
  "JBL",
  "BIC",
  "UPS",
  "XL",
  "XXL",
]);
const NAME_ACRONYM_DISPLAY = { RPET: "rPET" };
/** Words that stay lower case in the middle of a Title Case name. */
const NAME_SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "wit", // a name the supplier cut off mid-word ("... T-Shirt wit")
  "w",
]);
/** Measurement units that stay lower case ("16 oz", "5000 mah"). */
const NAME_UNITS = new Set(["oz", "ounce", "ounces", "lb", "lbs", "ml", "mm", "cm", "ft", "inch"]);

/**
 * Consistent capitalization of a display name. Shouted names (over 70% capitals) are
 * converted to Title Case, keeping real acronyms (USB, LED, ...) and (R)/(TM) marks; in any
 * other name only words written entirely in lower case ("Golf visor") are capitalized.
 * Words with internal capitals, digits or symbols (rPET, TiTUS, 3.4, w/) are never touched.
 * Display only: ids come from the original name, so this can never change an id.
 */
export function normalizeNameCase(value) {
  const name = collapseWhitespace(value);
  if (!name) return name;
  const shouty = isShoutyName(name);
  const words = name.split(" ");
  const out = words.map((word, index) => {
    // split hyphenated compounds ("ANTI-SLIP" -> "Anti-Slip") and slash pairs
    return word
      .split(/([-/])/)
      .map((part, partIndex) => {
        if (!/[A-Za-z]/.test(part) || /\d/.test(part)) return part;
        const letters = part.replace(/[^A-Za-z]/g, "");
        const first = index === 0 && partIndex === 0;
        if (shouty && letters === letters.toUpperCase()) {
          const upper = letters.toUpperCase();
          if (NAME_ACRONYMS.has(upper))
            return part.replace(letters, NAME_ACRONYM_DISPLAY[upper] ?? upper);
          if (!first && NAME_SMALL_WORDS.has(letters.toLowerCase())) return part.toLowerCase();
          if (NAME_UNITS.has(letters.toLowerCase())) return part.toLowerCase();
          return part.charAt(0) + part.slice(1).toLowerCase();
        }
        // not shouty: only fully lower-case words of 3+ letters are capitalized
        if (letters === letters.toLowerCase() && letters.length >= 3) {
          if (!first && NAME_SMALL_WORDS.has(letters)) return part;
          if (NAME_UNITS.has(letters)) return part;
          return part.charAt(0).toUpperCase() + part.slice(1);
        }
        return part;
      })
      .join("");
  });
  return out.join(" ");
}

// ---- Vendor ops text, typos and cut-off names (display name only) --------------------

/** Words in a name (letters and digits). */
function nameWords(value) {
  return str(value).match(/[A-Za-z0-9]+/g) ?? [];
}

/** Spelling slips seen in supplier names; display only, so ids never change. */
export const NAME_TYPOS = [
  [/\breuseable\b/gi, "reusable"],
  [/\bremoveable\b/gi, "removable"],
  [/\badjustible\b/gi, "adjustable"],
];

function matchCase(found, fix) {
  if (found === found.toUpperCase() && found.length > 1) return fix.toUpperCase();
  return found[0] === found[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix;
}

/** Spelling fixes plus doubled inch marks ("40'' x 100'" -> '40" x 100\''). */
export function fixNameTypos(value) {
  let name = collapseWhitespace(value);
  for (const [re, fix] of NAME_TYPOS) name = name.replace(re, (found) => matchCase(found, fix));
  return name.replace(/(\d)\s*''/g, '$1"');
}

// separator after a leading label: punctuation, a spaced dash, or plain space ("Budget-Friendly" is not a label)
const LABEL_SEP = "(?:\\s*[:!]+\\s*|\\s+[-\\u2013\\u2014]\\s+|\\s+)";
const LEADING_OPS_LABELS = new RegExp(
  `^(?:special(?:\\s+offer)?\\s*!+\\s*|special\\s*[:\\u2013\\u2014-]\\s+|` +
    `in[\\s-]stock${LABEL_SEP}|best[\\s-]+value${LABEL_SEP}|most[\\s-]+popular${LABEL_SEP}|` +
    `quick[\\s-]?ship${LABEL_SEP}|price[\\s-]*saver${LABEL_SEP}|` +
    `new(?!\\s+(?:era|balance|york|england|englander|jersey|orleans|hampshire|mexico|zealand)\\b)${LABEL_SEP}|` +
    `budget(?!\\s+(?:planner|book|binder|tracker|calendar|journal)\\b)${LABEL_SEP})`,
  "i"
);
const USA_MADE = "(?:usa[\\s-]+made|made[\\s-]+in[\\s-]+(?:the[\\s-]+)?(?:usa|u\\.s\\.a\\.?))";

/**
 * Display-name cleanup of vendor ops/marketing text: "Special!", "QuickShip", "In Stock", "Rush",
 * "Best Value", "Most Popular", "New", "Pricebuster" / "Price Saver" / "Budget" lead-ins, and (only
 * when the supplier flags the product as made in the USA, so the fact survives in the description)
 * "USA Made" / "Made in the USA" prefixes and suffixes. A name that would shrink to fewer than two
 * words is left as the typo-fixed original, so a nameOverrides entry can supply a real one.
 * Display only: ids always come from the original cleanName() output.
 */
export function stripVendorNameNoise(value, { usa = false } = {}) {
  const fixed = fixNameTypos(value);
  let name = fixed;
  for (let i = 0; i < 3 && LEADING_OPS_LABELS.test(name); i++) {
    name = name.replace(LEADING_OPS_LABELS, "");
  }
  name = name
    .replace(/\s*[-–—]\s*quick[\s-]?ship\b/gi, " ")
    .replace(/\bquick[\s-]?ship\b/gi, " ")
    .replace(/\bprice[\s-]*buster\b/gi, " ")
    // "(Printed in USA - Rush)" keeps the printed-in-USA fact and loses the ops word
    .replace(/\(([^)]*)\)/g, (whole, inner) => {
      if (!/\brush\b/i.test(inner)) return whole;
      const rest = inner.replace(/\s*[-–—,]?\s*\brush\b\s*[-–—,]?\s*/gi, " ").trim();
      return /[A-Za-z0-9]/.test(rest) ? `(${rest})` : " ";
    })
    .replace(/\s*[-–—]\s*rush\s*$/i, "");
  if (usa) {
    name = name
      .replace(new RegExp(`^${USA_MADE}(?=[\\s:!-])[\\s:!\\u2013\\u2014-]*`, "i"), "")
      .replace(new RegExp(`^(\\S+)\\s+${USA_MADE}\\s+(?=\\S)`, "i"), "$1 ")
      .replace(new RegExp(`\\s*\\(${USA_MADE}\\)`, "gi"), "")
      .replace(new RegExp(`[\\s,\\-\\u2013\\u2014]+(?:always\\s+)?${USA_MADE}(?=\\s*[.]?(?:\\s+size\\b|\\s+[SML]\\b|\\s*$))`, "i"), "");
  }
  // trailing size fragments left as sentences ("... Blanket. Size L", "... Blanket. L.")
  name = name.replace(/\.\s+(?:size\s+)?(XS|S|M|L|XL|XXL)\.?\s*$/i, (_, size) => `, Size ${size.toUpperCase()}`);
  name = tidyPunctuation(dropUnbalancedParens(name))
    .replace(/(?:\s+[-–—])+$/g, "")
    .replace(/^(?:[-–—]\s*)+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  name = name.replace(/^[a-z]/, (c) => c.toUpperCase());
  return nameWords(name).length >= 2 ? name : fixed;
}

/** Cleaned names at least this long may have been cut off by the supplier's 60 character field. */
export const TRUNCATED_NAME_MIN_LENGTH = 56;
const DANGLING_WORDS = new Set([
  "w",
  "wit",
  "wi",
  "with",
  "and",
  "or",
  "for",
  "in",
  "of",
  "the",
  "a",
  "an",
  "to",
  "on",
  "at",
  "by",
  "from",
]);
/** Raw names this long (the supplier limit is 60) are where a fragment of 3-4 letters is trusted to be a cut-off word. */
const TRUNCATED_NAME_STRONG_LENGTH = 59;
/** Word starts the supplier's 60 character limit has been seen to leave behind ("... Domestic Prod"). */
const KNOWN_CUT_FRAGMENTS = new Set(["prod", "produ", "produc", "ins", "insu"]);
const SHORT_WORDS_TO_KEEP = new Set([
  "oz",
  "lb",
  "uv",
  "pu",
  "tv",
  "ac",
  "dc",
  "hd",
  "xl",
  "id",
  "pc",
  "qi",
  "us",
  "ml",
  "mm",
  "cm",
  "ft",
  "gb",
  "tb",
  "3d",
  "4k",
]);

/** Lowercase letter-only words of 3+ letters from names too short to have been cut off (a vocabulary of whole words). */
export function buildNameVocab(names) {
  const vocab = new Set();
  for (const raw of names) {
    const name = cleanName(raw);
    if (name.length >= TRUNCATED_NAME_MIN_LENGTH || /(?:\.{3}|…)\s*$/.test(str(raw))) continue;
    for (const word of name.toLowerCase().match(/[a-z]{3,}/g) ?? []) vocab.add(word);
  }
  return vocab;
}

function completesLonger(letters, vocab, extra = 1) {
  if (!vocab) return false;
  for (const word of vocab) {
    if (word.length >= letters.length + extra && word.startsWith(letters)) return true;
  }
  return false;
}

/**
 * Supplier names are cut at 60 characters, often mid-word ("... Insulated S", "... T-Shirt wit",
 * "... Sweat..."). The dangling fragment is dropped so the name ends on a whole word; nothing is
 * ever added. `rawLength` is the length of the cleaned raw name; `ellipsis` says the raw name ended
 * in "...". `vocab` (see buildNameVocab) lets a fragment of 4 or fewer letters ("Ins", "Prod",
 * "with Car") be recognized as the start of a longer word.
 * @param {string} value
 * @param {{ rawLength?: number, ellipsis?: boolean, vocab?: Set<string> }} [options]
 */
export function trimCutOffName(value, { rawLength = 0, ellipsis = false, vocab } = {}) {
  let name = collapseWhitespace(value);
  if (!ellipsis && !(rawLength >= TRUNCATED_NAME_MIN_LENGTH)) return name;
  for (let guard = 0; guard < 4; guard++) {
    const words = name.split(" ");
    if (words.length < 3) break;
    const last = words[words.length - 1];
    const prev = words[words.length - 2] ?? "";
    const letters = last.replace(/[^A-Za-z]/g, "").toLowerCase();
    const prevLetters = prev.replace(/[^A-Za-z]/g, "").toLowerCase();
    const hasDigit = /\d/.test(last);
    let cut = false;
    const strong = rawLength >= TRUNCATED_NAME_STRONG_LENGTH;
    if (!letters && !hasDigit) cut = true; // "-", "&", "w/"
    else if (letters === "in" && /\d/.test(prev)) cut = false; // "10.5x2.5x5 in": inches, not a cut
    else if (DANGLING_WORDS.has(letters)) cut = true;
    else if (letters.length === 1 && /^size$/i.test(prev)) cut = false; // "Size L"
    else if (!hasDigit && letters.length <= 2 && !SHORT_WORDS_TO_KEEP.has(letters)) cut = true;
    else if (!hasDigit && letters.length >= 3) {
      if (ellipsis && guard === 0 && completesLonger(letters, vocab)) cut = true;
      else if (strong && KNOWN_CUT_FRAGMENTS.has(letters)) cut = true;
      else if (strong && letters.length <= 4 && vocab && !vocab.has(letters) && completesLonger(letters, vocab))
        cut = true;
      else if (
        strong &&
        letters.length <= 4 &&
        (DANGLING_WORDS.has(prevLetters) || prev === "-") &&
        completesLonger(letters, vocab, 3)
      )
        cut = true;
    }
    if (!cut) break;
    name = words.slice(0, -1).join(" ");
    name = name.replace(/\s*[-–—,&/]+\s*$/, "").trim();
    ellipsis = false;
  }
  return tidyPunctuation(dropUnbalancedParens(name)) || collapseWhitespace(value);
}

// ---- Sizes and size-priced products ----------------------------------------------

const DIMENSION_ENTRY = /\d\s*(?:['"′″]|in\b|inch|ft\b|feet|sq\.?\s*in)|\d\s*[xX×]\s*[\d.]/i;

/**
 * The distinct physical sizes in a raw sizes field ("10 ' x 10 ', 10 ' x 20 '"), measurements
 * only: apparel letters (S, M, L), capacities (4 GB) and "One size" are not size options here.
 * @returns {string[]}
 */
export function parseSizeOptions(sizes) {
  const text = collapseWhitespace(sizes);
  if (!text) return [];
  const entries = text
    .split(/,\s*(?=[\d.])/)
    .map((entry) => normalizeMeasurements(entry))
    .filter((entry) => DIMENSION_ENTRY.test(entry));
  return [...new Set(entries)];
}

/** True when the product NAME itself lists several sizes ("8X8 and 8X10", "(6' 8' 10' 15' 20')", "All Sizes"). */
export function nameShowsSizes(name) {
  const text = str(name);
  if (/\ball\s+sizes\b|\bsizes\b/i.test(text)) return true;
  const pairs = text.match(/\d+(?:\.\d+)?\s*['"]?\s*x\s*\d+/gi) ?? [];
  if (pairs.length >= 2) return true;
  return /\(\s*\d+\s*['"]\s+\d+\s*['"](?:\s+\d+\s*['"])+\s*\)/.test(text);
}

/**
 * A size-priced product: the supplier flagged several price grids (multiGrid) AND the
 * product comes in several sizes, so the one tier set we show is for the base size.
 */
export function isSizePriced({ multiGrid, sizes, name }) {
  const flagged = multiGrid === 1 || multiGrid === true || multiGrid === "1";
  if (!flagged) return false;
  return parseSizeOptions(sizes).length >= 2 || nameShowsSizes(name);
}

/** First two measurements of a size entry, in inches ("3 ' x 5 '" -> [36, 60]); null when not comparable. */
function sizeInches(sizes) {
  const first = normalizeMeasurements(str(sizes).split(/,\s*(?=[\d.])/)[0] ?? "");
  const matches = [...first.matchAll(/(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?\s*(['"′″])?/g)];
  const dims = [];
  for (const m of matches) {
    if (!m[4]) continue;
    const base = Number(m[1]) + (m[2] ? Number(m[2]) / Number(m[3]) : 0);
    dims.push(m[4] === "'" || m[4] === "′" ? base * 12 : base);
  }
  return dims.length >= 2 ? dims.slice(0, 2).sort((a, b) => a - b) : null;
}

/** True when both rows give a comparable W x H size and the sizes clearly differ. */
export function sizesConflict(a, b) {
  const sa = sizeInches(a);
  const sb = sizeInches(b);
  if (!sa || !sb) return false;
  return sa.some((value, i) => Math.abs(value - sb[i]) / Math.max(value, sb[i]) > 0.05);
}

/** Value of "15 3/4" or "31.5" (0 when not a number). */
function measurementValue(text) {
  const m = String(text).match(/^(\d+(?:\.\d+)?)(?: (\d+)\/(\d+))?$/);
  if (!m) return 0;
  return Number(m[1]) + (m[2] ? Number(m[2]) / Number(m[3]) : 0);
}

/**
 * "W x H" from a raw sizes field when it holds ONE clean measurement ("15" x 23""), else "".
 * Skips lists, thicknesses given first ("0.25" x 60"") and anything under 2 units.
 */
export function primarySizeLabel(sizes) {
  const options = parseSizeOptions(sizes);
  if (options.length !== 1) return "";
  const m = options[0].match(
    /^(\d+(?:\.\d+)?(?: \d+\/\d+)?)(['"])\s*x\s*(\d+(?:\.\d+)?(?: \d+\/\d+)?)\2/
  );
  if (!m || measurementValue(m[1]) < 2 || measurementValue(m[3]) < 2) return "";
  return `${m[1]}${m[2]} x ${m[3]}${m[2]}`;
}

/** Nouns whose size is the first thing a shopper needs; a bare name like "Door Mat" gets its size appended. */
const SIZE_SENSITIVE_NOUN =
  /\b(?:rugs?|mats?|doormats?|carpets?|runners?|banners?|signs?|flags?|stickers?|magnets?|hangers?|towels?|blankets?|throws?|posters?|tablecloths?|decals?)\b/i;
const MAX_GENERIC_NAME_WORDS = 3;

/**
 * Deterministic improvement of a vague name using only the row's own sizes field:
 * "Door Mat" + size 15" x 23" -> "Door Mat, 15" x 23"". Applies to short names of
 * size-sensitive items that do not already carry a measurement and whose size is unambiguous.
 */
export function improveGenericName(name, sizes) {
  const words = str(name).split(/\s+/).filter(Boolean);
  if (words.length > MAX_GENERIC_NAME_WORDS) return name;
  if (/\d/.test(name) || !SIZE_SENSITIVE_NOUN.test(name)) return name;
  const label = primarySizeLabel(sizes);
  return label ? `${name}, ${label}` : name;
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

/** Trim, drop the "Show more/less" expander label, collapse spaces, Title Case a shouted name. */
export function basicColorName(raw) {
  return titleCaseColor(collapseWhitespace(str(raw).replace(/\s*show\s+(more|less)\s*$/i, "")));
}

/**
 * Entries that are print/decoration options or ordering notes, not colors
 * (compared case-insensitively against the whole cleaned name).
 */
export const NON_COLOR_PATTERNS = [
  /^various$/i,
  /^custom(?:\s+(?:shell\s+)?colou?rs?|\s*\(.*\))?$/i,
  /^(?:any\s*\/\s*all|any|all)\s+colou?rs?$/i,
  /^full\s+digital\s+printing$/i,
  /^stock\s+colou?rs?$/i,
  /^sublimated$/i,
  /^standard$/i,
  /^pms\s+colou?r\s+match(?:able)?$/i,
  /^cmyk$/i,
  /^full\s*imprint\s+avail(?:able)?$/i,
  /^full\s*colou?r\s+avail(?:able)?$/i,
];

/** True when a (cleaned) color entry names no color. */
export function isNonColor(name) {
  return NON_COLOR_PATTERNS.some((re) => re.test(name));
}

/**
 * Vendor spelling joins, applied by EXACT name only, each with its justification.
 * Anything not clearly justified by the data stays as supplied (for example
 * "Metblue" on the 26 oz sports bottle: its raw data gives no hint what it means).
 */
export const COLOR_ALIASES = [
  {
    from: "Pinetree",
    to: "Pine Tree",
    reason: "same RTIC colorway is spelled 'Pine Tree' on the sibling 30 oz tumbler",
  },
  {
    from: "Terracotta Sunsert",
    to: "Terracotta Sunset",
    reason: "typo; the sibling Owala bottle lists the same colorway as 'Terracotta Sunset'",
  },
];
const ALIAS_BY_NAME = new Map(COLOR_ALIASES.map((a) => [a.from.toLowerCase(), a.to]));

/**
 * Remove vendor numeric codes: "Black Heather - 104", "White -080", "Red 060",
 * "Sky Blue - 470", "Navy-040", "Yellow - 108c", "Blue 286 C", "Maroon PMS 208",
 * a leading "01 Black". Small trailing numbers that are part of the name
 * ("Cool Grey 6", "Camo1") are kept.
 */
export function stripColorCode(name) {
  let out = str(name);
  out = out.replace(/^\d{2}\s+(?=[A-Za-z])/, "");
  out = out.replace(/\s*\bPMS\s*#?\s*\d{2,5}\s*[cu]?$/i, "");
  out = out.replace(/\s*[-–]\s*\d{2,4}\s?[cC]?$/, "");
  out = out.replace(/\s+\d{3,4}(?:\s?[cC])?$/, "");
  return collapseWhitespace(out.replace(/[\s\-–]+$/, ""));
}

/**
 * One color entry -> its cleaned name, or null when it is not a color.
 * Input is the basic-cleaned name; the result is stable (cleaning it again
 * returns the same string).
 */
export function refineColorName(name) {
  let out = str(name).replace(/\s*_\s*/g, "/");
  out = stripColorCode(out);
  out = out.replace(/^[\s\-–/]+|[\s\-–/]+$/g, "");
  if (!/[A-Za-z]/.test(out)) return null;
  if (isNonColor(out)) return null;
  return ALIAS_BY_NAME.get(out.toLowerCase()) ?? out;
}

/**
 * Cleans a raw color list and records what happened to each entry.
 * `map` is keyed by the basic-cleaned name (what earlier imports stored, and so
 * what colorImages*.json uses) and holds the final name, or null if dropped.
 * Entries that collapse to the same name keep the first; later ones map to it.
 * @returns {{ colors: string[], map: Record<string, string | null> }}
 */
export function colorNameMap(colors) {
  const map = {};
  const colorsOut = [];
  if (!Array.isArray(colors)) return { colors: colorsOut, map };
  const firstByKey = new Map();
  for (const raw of colors) {
    const basic = basicColorName(raw);
    if (!basic) continue;
    const refined = refineColorName(basic);
    if (!refined) {
      map[basic] = null;
      continue;
    }
    const key = refined.toLowerCase();
    if (!firstByKey.has(key)) {
      firstByKey.set(key, refined);
      colorsOut.push(refined);
    }
    map[basic] = firstByKey.get(key);
  }
  return { colors: colorsOut, map };
}

export function cleanColors(colors) {
  return colorNameMap(colors).colors;
}

/**
 * Sort ascending by quantity, dedupe quantities (first occurrence wins),
 * drop non-positive quantities/prices, collapse runs of identical prices into
 * the first tier of the run, keep at most MAX_TIERS.
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
    // consecutive tiers with the same price are one break: keep the FIRST of the run
    if (out.length > 0 && out[out.length - 1][1] === tier[1]) continue;
    out.push(tier);
  }
  return out.slice(0, MAX_TIERS);
}

/** Detect a recognizable brand at the start of the name; "Essentials" if none. */
export function detectBrand(name) {
  const text = collapseWhitespace(name).replace(/^[\u00ae\u2122\s]+/, "");
  const words = text.split(" ");
  const limit = Math.min(words.length, BRAND_WINDOW);
  for (let k = 0; k < limit; k++) {
    const rest = words.slice(k).join(" ");
    for (const { brand, re } of BRAND_MATCHERS) {
      if (k > 0 && START_ONLY_BRANDS.has(brand)) continue;
      const match = re.exec(rest);
      if (!match) continue;
      const exclude = BRAND_EXCLUDE_NEXT[brand];
      if (exclude) {
        const next =
          rest
            .slice(match[0].length)
            .trim()
            .split(/[\s-]+/)[0]
            ?.toLowerCase() ?? "";
        if (exclude.includes(next)) continue;
      }
      return brand;
    }
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

/**
 * Keyword category rules, applied to the display name after the raw tag has chosen a category.
 * First matching rule wins; `from` limits a rule to products the scraper put in those categories
 * (omitted = any category). An explicit categoryOverrides entry in import-overrides.json always
 * beats a rule. Each rule's cluster is listed in __tests__/catalogQuality.test.ts.
 * @type {{ id: string, to: string, from?: string[], re: RegExp, reason: string }[]}
 */
export const CATEGORY_RULES = [
  {
    id: "lanyards-and-badges",
    to: "Lanyards & Badges",
    from: ["Event & Signage", "Awards & Recognition", "Print & Collateral", "Office & Writing"],
    re: /\blanyards?\b|\bbadge[\s-]+(?:holders?|reels?)\b|\b(?:name|id|employee|security)[\s-]+badges?\b/i,
    reason: "Lanyards, badge holders and name badges are their own shopping category.",
  },
  {
    id: "awards",
    to: "Awards & Recognition",
    from: ["Gifts & Entertaining"],
    re: /\b(?:awards?|plaques?|trophy|trophies|crystal|challenge[\s-]+coins?|coins?|lapel[\s-]+pins?|medallions?|medals?)\b/i,
    reason: "Awards, plaques, trophies, coins and lapel pins belong with Awards & Recognition.",
  },
  {
    id: "pens",
    to: "Office & Writing",
    from: ["Awards & Recognition", "Gifts & Entertaining"],
    re: /\bpens?\b(?!\s+holders?)/i,
    reason: "Pens belong with Office & Writing.",
  },
  {
    id: "cutting-boards",
    to: "Gifts & Entertaining",
    from: ["Awards & Recognition"],
    re: /\bcutting[\s-]+boards?\b/i,
    reason: "A cutting board is a gift item, not an award.",
  },
  {
    id: "bumper-stickers",
    to: "Automotive",
    re: /\bbumper[\s-]+stickers?\b/i,
    reason: "Bumper stickers belong with Automotive.",
  },
  {
    id: "promo-giveaways",
    to: "Promo Giveaways",
    from: [
      "Event & Signage",
      "Gifts & Entertaining",
      "Kids & Toys",
      "Seasonal & Holiday",
      "Health & Wellness",
      "Outdoor & Sports",
    ],
    re: new RegExp(
      [
        "\\bstress[\\s-]+balls?\\b",
        "\\bpush[\\s-]?pop\\b",
        "\\bhand(?:[\\s-]?held)?\\s+fans?\\b",
        "\\bhandheld\\s+(?:\\w+\\s+)?fans?\\b",
        "\\bfoldable\\s+(?:nylon\\s+)?fans?\\b",
        "\\bclappers?\\b",
        "\\bnoise[\\s-]?makers?\\b",
        "\\bfoam\\s+fingers?\\b",
        "\\bwristbands?\\b",
        "\\bsilicone\\s+bands?\\b",
        "\\bchunky\\s+bands?\\b",
        "\\bbuttons?\\b",
      ].join("|"),
      "i"
    ),
    reason:
      "Stress balls, hand fans, clappers, noise makers, foam fingers, wristbands, buttons and push-pop toys are low-cost promo giveaways.",
  },
];

/**
 * The category a rule moves a product to, or null. Pure; `name` is the display name.
 * @param {{ name: string, category: string }} input
 * @returns {{ category: string, ruleId: string, reason: string } | null}
 */
export function categoryFromRules({ name, category }) {
  for (const rule of CATEGORY_RULES) {
    if (rule.from && !rule.from.includes(category)) continue;
    if (!rule.re.test(str(name))) continue;
    if (rule.to === category) return null;
    return { category: rule.to, ruleId: rule.id, reason: rule.reason };
  }
  return null;
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

/** Words in a description body, ignoring punctuation. */
function wordCount(text) {
  return str(text)
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** A description body shorter than this is "thin": it gets factual detail from the row's own fields. */
export const THIN_DESCRIPTION_WORDS = 4;
const MAX_SIZE_FACT_LENGTH = 80;

/**
 * Fix a unit typo in a size string, but only when the data itself makes the unit unambiguous:
 * a third measurement under one foot after two foot measurements is a thickness in inches
 * ("3' x 10' x 0.375'" -> '3\' x 10\' x 0.375"'), and a size written ONLY with doubled
 * apostrophes is in inches ("3.3'' x 2.1''" -> '3.3" x 2.1"'). Anything mixed or unclear is
 * left exactly as the supplier wrote it.
 */
export function fixSizeUnits(value) {
  let text = normalizeMeasurements(value);
  text = text.replace(
    /(\d+(?:\.\d+)?')\s*x\s*(\d+(?:\.\d+)?')\s*x\s*(0?\.\d+)'(?!')/g,
    (whole, a, b, c) => (Number.parseFloat(a) >= 2 && Number.parseFloat(b) >= 2 ? `${a} x ${b} x ${c}"` : whole)
  );
  if (/\d''/.test(text) && !/\d'(?!')/.test(text)) text = text.replace(/(\d)''/g, '$1"');
  return text;
}

/** A size like "2.25 D" or "9" has no unit, so it says nothing the name or photo does not. */
const UNITLESS_SIZE = /^[\d./\s]+(?:\s*(?:d|dia|l|w|h|t))?\.?$/i;

/**
 * The size line worth showing in a description: the supplier's size field, tidied, when it is
 * short and carries a unit or apparel sizes; "" for unit-less fragments ("2.25 D", "31/2 D").
 */
export function informativeSize(sizes) {
  const size = fixSizeUnits(collapseWhitespace(sizes));
  if (!size || size.length > MAX_SIZE_FACT_LENGTH) return "";
  if (UNITLESS_SIZE.test(size)) return "";
  return size;
}

/** "A, B and C" */
function joinColors(colors) {
  return colors.length < 2
    ? colors.join("")
    : `${colors.slice(0, -1).join(", ")} and ${colors[colors.length - 1]}`;
}

/**
 * Facts for a thin description, drawn only from the row: the size line, or (with nothing else)
 * the product name and, for a short list, its colors. The color COUNT and the volume break are
 * never written: the swatches and the price table already show them.
 */
function thinDescriptionFacts({ base, size, colors, name }) {
  const facts = [];
  if (size && !base.includes(size)) facts.push(`Size: ${size}.`);
  if (!base && facts.length === 0 && name) {
    facts.push(`${name.replace(/[.!?]+$/, "")}.`);
    if (colors.length >= 2 && colors.length <= 4) facts.push(`Available in ${joinColors(colors)}.`);
  }
  return facts;
}

/**
 * @param {{ rawDescription: string, colorCount?: number, sizes: string, minQty: number,
 *   usa: unknown, multiGrid: unknown, sizePriced?: boolean, enrich?: { name?: string, colors?: string[], breakQty?: number } }} input
 *   `colorCount` and `enrich.breakQty` are accepted but never written (the swatches and the price table show them).
 *   `sizePriced`: the page shows PRICE_NOTE_SIZE, so the generic "base size or option" sentence is dropped.
 *   `enrich`: when given, a thin body (under THIN_DESCRIPTION_WORDS words) is extended with
 *   facts from the row (size, or the name and a short color list); the importer always passes it.
 */
export function buildDescription({
  rawDescription,
  sizes,
  minQty,
  usa,
  multiGrid,
  sizePriced = false,
  enrich,
}) {
  let base = fixSizeUnits(cleanDescriptionText(rawDescription));
  const size = informativeSize(sizes);
  if (!base) {
    // the color count is not stated: the swatches already show it
    base = size ? `Size: ${size}.` : "";
  } else if (!(/[.!?)'\u201d]$/.test(base) || (/"$/.test(base) && !/\d"$/.test(base)))) {
    // A closing quote ends a sentence, but a digit followed by " is an inch mark.
    base += ".";
  }
  if (enrich && wordCount(base) < THIN_DESCRIPTION_WORDS) {
    const facts = thinDescriptionFacts({
      base,
      size: size && !base.includes("Size:") ? size : "",
      colors: enrich.colors ?? [],
      name: enrich.name,
    });
    base = [base, ...facts].filter(Boolean).join(" ");
  }
  const sentences = [];
  const usaFlag = usa === 1 || usa === true || usa === "1";
  // Skip the prefix when the supplier text already says so ("Made in USA.").
  if (usaFlag && !/made\s+in\s+(the\s+)?u\.?s\.?a\b/i.test(base)) {
    sentences.push("Made in the USA.");
  }
  if (base) sentences.push(base);
  if ((multiGrid === 1 || multiGrid === true || multiGrid === "1") && !sizePriced) {
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
  "moq-too-high",
  "no-image",
  "image-failed",
  "duplicate-of-curated",
  "duplicate-same-vendor",
  "duplicate-other-vendor",
  "duplicate-image",
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
 * Rows with protected (hand-sourced photo / link) ids first, then
 * higher vendor score, more reviews, more colors, lower first-tier price,
 * then lexicographically smaller espId (deterministic).
 * @param {{ vendor: { rating: number, reviews: number }, product: CleanProduct, espId: string }} a
 * @param {{ vendor: { rating: number, reviews: number }, product: CleanProduct, espId: string }} b
 */
export function compareCandidates(a, b) {
  // a row carrying hand-sourced color photos / curated links is never the one dropped
  if (Boolean(a.protectedRow) !== Boolean(b.protectedRow)) return a.protectedRow ? -1 : 1;
  const sa = vendorScore(a.vendor.rating, a.vendor.reviews);
  const sb = vendorScore(b.vendor.rating, b.vendor.reviews);
  if (Math.abs(sa - sb) > 1e-9) return sb - sa;
  if (a.vendor.reviews !== b.vendor.reviews) return b.vendor.reviews - a.vendor.reviews;
  // stability: between otherwise equal rows, keep the one already in the catalog so its
  // id (referenced by carts, color photos, ESP links) does not flip when a twin appears
  if (Boolean(a.preferred) !== Boolean(b.preferred)) return a.preferred ? -1 : 1;
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

/** Extra guards for the looser cross-supplier test: a different shape or feature is a different product. */
export const NEAR_DISCRIMINATOR_TOKENS = new Set([
  ...DISCRIMINATOR_TOKENS,
  "oval",
  "round",
  "square",
  "circle",
  "rectangle",
  "rectangular",
  "heart",
  "star",
  "hexagon",
  "triangle",
  "diamond",
  "retractable",
  "foldable",
  "magnetic",
  "wireless",
  "rechargeable",
]);

/**
 * Near-duplicate test between rows from DIFFERENT suppliers (same category assumed):
 * Jaccard >= NEAR_DUPLICATE_JACCARD with no differing number, gender/age/sleeve word,
 * shape or feature word, and (when both rows give a comparable W x H) matching sizes.
 */
export function isNearDuplicate(tokensA, tokensB, sizesA = "", sizesB = "") {
  const min = Math.min(tokensA.size, tokensB.size);
  const max = Math.max(tokensA.size, tokensB.size);
  if (min === 0 || min / max < NEAR_DUPLICATE_JACCARD) return false;
  if (jaccard(tokensA, tokensB) < NEAR_DUPLICATE_JACCARD) return false;
  for (const t of tokensA) {
    if (!tokensB.has(t) && (NEAR_DISCRIMINATOR_TOKENS.has(t) || /\d/.test(t))) return false;
  }
  for (const t of tokensB) {
    if (!tokensA.has(t) && (NEAR_DISCRIMINATOR_TOKENS.has(t) || /\d/.test(t))) return false;
  }
  return !sizesConflict(sizesA, sizesB);
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
 * @returns {{ skip: string, product?: undefined, idName?: undefined, colorMap?: undefined } | { skip?: undefined, espId: string, imgId: string, idName: string, colorMap: Record<string, string | null>, product: CleanProduct, link: EspLink, vendor: { key: string, rating: number, reviews: number } }}
 */
export function cleanRow(row, ctx = {}) {
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

  // ids are ALWAYS derived from idName (the original cleanName output), so they stay
  // stable no matter how the displayed name is polished.
  const idName = cleanName(nameRaw);
  if (!idName) return { skip: "empty-name" };
  if (idName.length > MAX_NAME_LENGTH) return { skip: "name-too-long" };
  const usa = Number(usaRaw) === 1 ? 1 : 0;
  // display name: cut-off tail, vendor ops text and typos removed, then consistent casing
  const cutOff = trimCutOffName(cleanDisplayName(nameRaw), {
    rawLength: idName.length,
    ellipsis: /(?:\.{3}|\u2026)\s*$/.test(str(nameRaw)),
    vocab: ctx.vocab,
  });
  const name = normalizeNameCase(stripVendorNameNoise(cutOff, { usa: usa === 1 }));
  if (!name) return { skip: "empty-name" };
  const nameBeforePolish = normalizeNameCase(cleanDisplayName(nameRaw));

  const tiers = cleanTiers(tiersRaw);
  if (tiers.length === 0) return { skip: "no-tiers" };
  if (tiers[0][0] > MAX_MIN_QUANTITY) return { skip: "moq-too-high" };
  if (tiers[0][1] > MAX_FIRST_TIER_PRICE) return { skip: "price-too-high" };

  const imgId = collapseWhitespace(imgIdRaw);
  if (!/^\d+$/.test(imgId)) return { skip: "no-image" };

  const { colors, map: colorMap } = colorNameMap(colorsRaw);
  const multiGrid = Number(multiGridRaw) === 1 ? 1 : 0;

  const sizePriced = isSizePriced({ multiGrid, sizes: sizesRaw, name });
  const description = buildDescription({
    rawDescription: descRaw,
    sizes: sizesRaw,
    minQty: tiers[0][0],
    usa,
    multiGrid,
    sizePriced,
    enrich: { name, colors: colors.slice(0, MAX_COLORS) },
  });

  const supplier = collapseWhitespace(supplierRaw);
  return {
    espId,
    imgId,
    vendor: { key: (asi || supplier).toLowerCase(), rating, reviews },
    idName,
    nameBeforePolish,
    colorMap,
    sizes: collapseWhitespace(sizesRaw),
    product: {
      name,
      category,
      brand: detectBrand(name),
      description,
      tiers,
      imageAlt: name,
      colors: colors.slice(0, MAX_COLORS),
      ...(sizePriced ? { priceNote: PRICE_NOTE_SIZE } : {}),
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
 *   keepApart?: { espIds: string[], reason?: string }[],
 *   categoryOverrides?: { espId: string, category: string, reason: string }[],
 *   nameOverrides?: { espId: string, name: string, reason: string }[],
 *   duplicateImageEspIds?: Iterable<string>,
 *   preferEspIds?: Iterable<string>,
 *   protectedEspIds?: Iterable<string>
 * }} [opts] `rejectedEspIds`: rows whose image could not be fetched; excluded so a
 *   runner-up from the same cluster is selected instead.
 * @returns {{
 *   items: CatalogItem[],
 *   skipped: Record<string, number>,
 *   skippedDetail: { reason: string, espId?: string, name?: string }[],
 *   clusters: { kept: MemberInfo, dropped: (MemberInfo & { reason: string })[] }[],
 *   curatedDuplicates: { dropped: MemberInfo, curated: string }[],
 *   manualOverrides: { dropped: MemberInfo, reason: string }[],
 *   categoryMoved: { espId: string, name: string, from: string, to: string, reason: string }[],
 *   renamed: { espId: string, from: string, to: string, reason: string }[],
 *   nameCollisions: { espId: string, name: string, sameAs: string }[]
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
  const categoryMoves = new Map((opts.categoryOverrides ?? []).map((o) => [o.espId, o]));
  const categoryMoved = [];
  const imageDuplicates = new Set(opts.duplicateImageEspIds ?? []);
  const preferred = new Set(opts.preferEspIds ?? []);
  const protectedRows = new Set(opts.protectedEspIds ?? []);
  const nameOverrides = new Map((opts.nameOverrides ?? []).map((o) => [String(o.espId).trim(), o]));

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
  const cleanCtx = { vocab: buildNameVocab(rows.map((r) => (Array.isArray(r) ? r[2] : ""))) };
  for (const row of rows) {
    const cleaned = cleanRow(row, cleanCtx);
    if (cleaned.skip) {
      skip(cleaned.skip, { espId: Array.isArray(row) ? str(row[0]) : undefined });
      continue;
    }
    // keyword category rules, then explicit category overrides (scripts/data/import-overrides.json),
    // both before clustering so duplicates are only compared inside the final category
    const ruleMove = categoryFromRules(cleaned.product);
    if (ruleMove && !categoryMoves.has(cleaned.espId)) {
      categoryMoved.push({
        espId: cleaned.espId,
        name: cleaned.product.name,
        from: cleaned.product.category,
        to: ruleMove.category,
        reason: ruleMove.reason,
        rule: ruleMove.ruleId,
      });
      cleaned.product.category = ruleMove.category;
    }
    const move = categoryMoves.get(cleaned.espId);
    if (move && move.category !== cleaned.product.category) {
      categoryMoved.push({
        espId: cleaned.espId,
        name: cleaned.product.name,
        from: cleaned.product.category,
        to: move.category,
        reason: move.reason,
      });
      cleaned.product.category = move.category;
    }
    const detail = { espId: cleaned.espId, name: cleaned.product.name };
    if (imageDuplicates.has(cleaned.espId)) {
      skip("duplicate-image", detail);
      continue;
    }
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
      preferred: preferred.has(cleaned.espId),
      protectedRow: protectedRows.has(cleaned.espId),
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
  const vendorSets = new Map(candidates.map((c) => [c.idx, new Set([c.vendor.key])])); // root -> vendor keys
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
    vendorSets.set(lo, new Set([...vendorSets.get(lo), ...vendorSets.get(hi)]));
    vendorSets.delete(hi);
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
  // pass 1: exact-ish duplicates (any supplier). pass 2: the looser cross-supplier rule, run
  // only after pass 1 so each cluster's supplier set is complete when it is checked.
  for (const list of byCategory.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (find(list[i].idx) === find(list[j].idx)) continue;
        if (isDuplicateTokens(list[i].tokens, list[j].tokens)) union(list[i].idx, list[j].idx);
      }
    }
  }
  for (const list of byCategory.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (find(list[i].idx) === find(list[j].idx)) continue;
        if (list[i].vendor.key === list[j].vendor.key) continue;
        // never merges away a row that carries hand-sourced color photos / links...
        if (list[i].protectedRow || list[j].protectedRow) continue;
        // ...and never joins two clusters that already hold rows from the same supplier: that
        // supplier lists both as separate products ("Door Hanger" vs "Door Hanger w/Pocket")
        const va = vendorSets.get(find(list[i].idx));
        const vb = vendorSets.get(find(list[j].idx));
        if ([...va].some((key) => vb.has(key))) continue;
        if (isNearDuplicate(list[i].tokens, list[j].tokens, list[i].sizes, list[j].sizes)) {
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

  // ---- 5) display names (after selection, so renaming never changes which rows cluster) ----
  // ids are derived from idName in step 6 and are NOT affected by anything below
  const renamed = [];
  for (const w of winners) {
    if (w.nameBeforePolish && w.nameBeforePolish !== w.product.name) {
      renamed.push({
        espId: w.espId,
        from: w.nameBeforePolish,
        to: w.product.name,
        reason: "vendor ops text, typo or cut-off fragment removed",
      });
    }
    const override = nameOverrides.get(w.espId);
    const name = override ? override.name : improveGenericName(w.product.name, w.sizes);
    if (name === w.product.name) continue;
    renamed.push({
      espId: w.espId,
      from: w.product.name,
      to: name,
      reason: override
        ? override.reason
        : "generic name: size added from the supplier's size field",
    });
    w.product = { ...w.product, name, imageAlt: name, brand: detectBrand(name) };
  }
  // two products must not end up with the same name: add the size when that tells them apart
  const nameCollisions = [];
  const claimed = new Map(curated.map((c) => [normalizeName(c.name), c.id || c.name]));
  for (const w of winners) {
    let key = normalizeName(w.product.name);
    if (claimed.has(key)) {
      const label = primarySizeLabel(w.sizes);
      const sized = label ? `${w.product.name}, ${label}` : "";
      if (sized && !claimed.has(normalizeName(sized))) {
        renamed.push({
          espId: w.espId,
          from: w.product.name,
          to: sized,
          reason: `same name as ${claimed.get(key)}: size added`,
        });
        w.product = { ...w.product, name: sized, imageAlt: sized };
        key = normalizeName(sized);
      } else {
        nameCollisions.push({ espId: w.espId, name: w.product.name, sameAs: claimed.get(key) });
      }
    }
    claimed.set(key, w.espId);
  }

  // ---- 6) ids ---------------------------------------------------------------
  const taken = new Map(curatedIds.map((id) => [id, ""]));
  const items = [];
  for (const w of winners) {
    const id = makeUniqueId(w.idName, w.espId, taken);
    if (!id) {
      skip("id-collision", { espId: w.espId, name: w.product.name });
      continue;
    }
    taken.set(id, w.espId);
    items.push({
      id,
      imgId: w.imgId,
      product: w.product,
      link: w.link,
      vendor: w.vendor,
      colorMap: w.colorMap,
    });
  }

  return {
    items,
    skipped,
    skippedDetail,
    clusters,
    curatedDuplicates,
    manualOverrides,
    categoryMoved,
    renamed,
    nameCollisions,
  };
}

// ---- Report-only checks (never shipped to the client) -----------------------------------

/** First-tier unit price above this multiple of its category's median is flagged. */
export const SUSPECT_MEDIAN_MULTIPLE = 10;
/** A first-tier price at least this many times the last tier (3+ tiers) is a steep volume drop. */
export const SUSPECT_STEEP_DROP = 4;
/** Items normally sold for a few cents to a few dollars each; a high unit price may be per-1000 / per-pack. */
const SMALL_FORMAT_ITEM =
  /\b(?:letterheads?|envelopes?|stickers?|labels?|magnets?|mints?|buttermints?|candy|candies|buttons?|pins?|decals?|coasters?|bookmarks?|flyers?|postcards?|brochures?|notepads?|tattoos?|balloons?|keychains?|ornaments?)\b/i;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Report-only price sanity check on RAW ESP catalog tiers (prices are never changed). Flags:
 *  - over-10x-category-median: first-tier unit price over 10 times the category median;
 *  - steep-volume-drop: first tier at least 4 times the last tier across 3+ tiers;
 *  - small-format-unit-price: a small printed/consumable item (letterhead, magnet, mint, sticker...)
 *    whose first-tier price is over $10 and over 3 times the category median, i.e. the tiers may be
 *    per-1000 or per-pack prices. Those are `per1000Suspect`.
 * @param {CatalogItem[]} items
 * @returns {{ id: string, espId: string, name: string, category: string, firstTier: [number, number],
 *   lastTier: [number, number], categoryMedian: number, reasons: string[], per1000Suspect: boolean }[]}
 */
export function findSuspectPricing(items) {
  const byCategory = new Map();
  for (const item of items) {
    const list = byCategory.get(item.product.category) ?? [];
    list.push(item.product.tiers[0][1]);
    byCategory.set(item.product.category, list);
  }
  const medians = new Map(
    [...byCategory].map(([category, prices]) => [category, prices.length >= 5 ? median(prices) : 0])
  );
  const out = [];
  for (const item of items) {
    const { tiers, category, name } = item.product;
    const [firstQty, first] = tiers[0];
    const last = tiers[tiers.length - 1][1];
    const categoryMedian = medians.get(category) ?? 0;
    const reasons = [];
    if (categoryMedian > 0 && first > SUSPECT_MEDIAN_MULTIPLE * categoryMedian)
      reasons.push("over-10x-category-median");
    if (tiers.length >= 3 && first >= SUSPECT_STEEP_DROP * last) reasons.push("steep-volume-drop");
    const per1000 =
      categoryMedian > 0 &&
      SMALL_FORMAT_ITEM.test(name) &&
      first > 10 &&
      first > 3 * categoryMedian;
    if (per1000) reasons.push("small-format-unit-price");
    if (reasons.length === 0) continue;
    out.push({
      id: item.id,
      espId: item.link.espId,
      name,
      category,
      firstTier: [firstQty, first],
      lastTier: tiers[tiers.length - 1],
      categoryMedian: Math.round(categoryMedian * 100) / 100,
      reasons,
      per1000Suspect: per1000,
    });
  }
  return out.sort(
    (a, b) =>
      Number(b.per1000Suspect) - Number(a.per1000Suspect) ||
      b.firstTier[1] / (b.categoryMedian || 1) - a.firstTier[1] / (a.categoryMedian || 1)
  );
}

/** Named third-party consumer brands (a business decision for the owner; nothing is hidden or removed). */
export const THIRD_PARTY_CONSUMER_BRANDS = [
  "Apple",
  "Beats",
  "Hershey",
  "Snickers",
  "Payday",
  "M&M's",
  "Mike and Ike",
  "Maglite",
];

/** Products whose detected brand is a third-party consumer brand (report-only). */
export function findThirdPartyBrandProducts(items) {
  const brands = new Set(THIRD_PARTY_CONSUMER_BRANDS);
  return items
    .filter((item) => brands.has(item.product.brand))
    .map((item) => ({ id: item.id, name: item.product.name, brand: item.product.brand }))
    .sort((a, b) => (a.brand < b.brand ? -1 : a.brand > b.brand ? 1 : a.id < b.id ? -1 : 1));
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
 * Validate the categoryOverrides section: espId -> category (must be a known
 * site category) with a reason.
 * @returns {{ espId: string, category: string, reason: string }[]}
 */
export function parseCategoryOverrides(json) {
  const list = json?.categoryOverrides ?? [];
  if (!Array.isArray(list))
    throw new Error("import-overrides.json: categoryOverrides must be an array");
  const known = new Set(Object.values(TAG_TO_CATEGORY));
  const seen = new Set();
  return list.map((entry, i) => {
    const espId = collapseWhitespace(entry?.espId);
    const category = collapseWhitespace(entry?.category);
    const reason = collapseWhitespace(entry?.reason);
    if (!espId) throw new Error(`import-overrides.json: categoryOverrides[${i}] has no espId`);
    if (!known.has(category)) {
      throw new Error(
        `import-overrides.json: categoryOverrides[${i}] unknown category "${category}"`
      );
    }
    if (!reason) throw new Error(`import-overrides.json: categoryOverrides[${i}] has no reason`);
    if (seen.has(espId))
      throw new Error(`import-overrides.json: duplicate category override ${espId}`);
    seen.add(espId);
    return { espId, category, reason };
  });
}

/**
 * Validate the nameOverrides section: espId -> better display name, with a reason. The name must
 * only use words from the product's own raw name, description or sizes (checked by review and
 * by the catalog tests); it never changes the product id.
 * @returns {{ espId: string, name: string, reason: string }[]}
 */
export function parseNameOverrides(json) {
  const list = json?.nameOverrides ?? [];
  if (!Array.isArray(list))
    throw new Error("import-overrides.json: nameOverrides must be an array");
  const seen = new Set();
  return list.map((entry, i) => {
    const espId = collapseWhitespace(entry?.espId);
    const name = collapseWhitespace(entry?.name);
    const reason = collapseWhitespace(entry?.reason);
    if (!espId) throw new Error(`import-overrides.json: nameOverrides[${i}] has no espId`);
    if (!name) throw new Error(`import-overrides.json: nameOverrides[${i}] (${espId}) has no name`);
    if (name.length > MAX_NAME_LENGTH)
      throw new Error(`import-overrides.json: nameOverrides[${i}] (${espId}) name is too long`);
    if (isShoutyName(name))
      throw new Error(`import-overrides.json: nameOverrides[${i}] (${espId}) name is all caps`);
    if (!reason)
      throw new Error(`import-overrides.json: nameOverrides[${i}] (${espId}) has no reason`);
    if (seen.has(espId)) throw new Error(`import-overrides.json: duplicate name override ${espId}`);
    seen.add(espId);
    return { espId, name, reason };
  });
}

/** Warn about name overrides whose espId is in no raw file. */
export function checkNameOverrides({ nameOverrides, rawEspIds }) {
  const raw = new Set(rawEspIds);
  return nameOverrides
    .filter((o) => !raw.has(o.espId))
    .map((o) => `stale name override: espId ${o.espId} is not present in any raw file (${o.name})`);
}

/** Warn about category overrides whose espId is in no raw file. */
export function checkCategoryOverrides({ categoryOverrides, rawEspIds }) {
  const raw = new Set(rawEspIds);
  return categoryOverrides
    .filter((o) => !raw.has(o.espId))
    .map(
      (o) =>
        `stale category override: espId ${o.espId} is not present in any raw file (${o.reason})`
    );
}

/**
 * Products whose (compressed) images are byte-identical are duplicates. Keep the
 * best one by the usual ranking (vendor score, reviews, colors, price, espId) and
 * return the rest as losers.
 * @param {CatalogItem[]} items
 * @param {Map<string, string>} hashByEspId espId -> content hash
 * @returns {{ losers: { espId: string, keptEspId: string }[], groups: { kept: CatalogItem, dropped: CatalogItem[] }[] }}
 */
export function findDuplicateImages(items, hashByEspId) {
  const byHash = new Map();
  for (const item of items) {
    const hash = hashByEspId.get(item.link.espId);
    if (!hash) continue;
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push(item);
  }
  const losers = [];
  const groups = [];
  for (const members of byHash.values()) {
    if (members.length < 2) continue;
    const ranked = [...members].sort((a, b) =>
      compareCandidates({ ...a, espId: a.link.espId }, { ...b, espId: b.link.espId })
    );
    const [kept, ...dropped] = ranked;
    groups.push({ kept, dropped });
    for (const d of dropped) losers.push({ espId: d.link.espId, keptEspId: kept.link.espId });
  }
  return { losers, groups };
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
 * Rewrite per-color photo KEYS after color-name cleanup so photos keep mapping.
 * Only keys move or disappear; photo paths (values) are never edited.
 *  - a key that already equals a final color name is kept as is
 *  - a key found in the product's colorMap becomes its cleaned name, or is removed
 *    when that color was dropped as a non-color
 *  - two keys that collapse to one name keep the photo of the FIRST color in the
 *    product's color order; the other key is removed
 *  - a key that is neither is reported as unresolved (the caller must stop)
 * Curated products (not in `items`) are never touched.
 * @param {{ file: string, data: Record<string, Record<string, string>> }[]} files in load order
 * @param {{ id: string, colors?: string[], colorMap: Record<string, string | null> }[]} items
 * @returns {{
 *   files: { file: string, data: Record<string, Record<string, string>> }[],
 *   moves: { id: string, from: string, to: string | null, reason: string }[],
 *   renamed: number, dropped: number, merged: number,
 *   removedPaths: string[], unresolved: string[]
 * }}
 */
export function remapColorImageKeys(files, items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const moves = [];
  const unresolved = [];
  const removedPaths = [];
  let renamed = 0;
  let dropped = 0;
  let merged = 0;
  const taken = new Map(); // id -> Set of final keys already kept (earlier files / earlier colors)
  const out = files.map(({ file, data }) => {
    const next = {};
    for (const [id, byColor] of Object.entries(data)) {
      const item = byId.get(id);
      if (!item) {
        next[id] = byColor;
        continue;
      }
      const final = new Set(item.colors ?? []);
      const order = Object.keys(item.colorMap);
      const position = (key) => {
        const i = order.indexOf(key);
        return i < 0 ? Number.MAX_SAFE_INTEGER : i;
      };
      const entries = Object.entries(byColor)
        .map(([key, src], index) => ({ key, src, index }))
        .sort((x, y) => position(x.key) - position(y.key) || x.index - y.index);
      if (!taken.has(id)) taken.set(id, new Set());
      const seen = taken.get(id);
      const kept = {};
      for (const { key, src } of entries) {
        let target;
        if (final.has(key)) target = key;
        else if (key in item.colorMap) target = item.colorMap[key];
        else {
          unresolved.push(`${id}: "${key}"`);
          kept[key] = src;
          continue;
        }
        if (target === null) {
          dropped++;
          removedPaths.push(src);
          moves.push({ id, from: key, to: null, reason: "not a color" });
          continue;
        }
        if (target !== key && (seen.has(target) || target in kept)) {
          merged++;
          removedPaths.push(src);
          moves.push({ id, from: key, to: null, reason: `merged into "${target}"` });
          continue;
        }
        if (target !== key) {
          renamed++;
          moves.push({ id, from: key, to: target, reason: "renamed" });
        }
        kept[target] = src;
        seen.add(target);
      }
      // restore the file's original key order for keys that kept their position
      const original = Object.keys(byColor).map((k) => (k in kept ? k : item.colorMap[k]));
      const ordered = {};
      for (const k of original) if (k && k in kept && !(k in ordered)) ordered[k] = kept[k];
      for (const k of Object.keys(kept)) if (!(k in ordered)) ordered[k] = kept[k];
      if (Object.keys(ordered).length > 0) next[id] = ordered;
    }
    return { file, data: next };
  });
  return { files: out, moves, renamed, dropped, merged, removedPaths, unresolved };
}

/**
 * Apply key moves to the photo-evidence fixture (entries with product + color).
 * @param {{ product: string, color: string }[]} samples
 * @param {{ id: string, from: string, to: string | null }[]} moves
 */
export function remapPhotoSamples(samples, moves) {
  const byKey = new Map(moves.map((m) => [`${m.id}\u0000${m.from}`, m.to]));
  const seen = new Set();
  const out = [];
  let changed = 0;
  for (const sample of samples) {
    const k = `${sample.product}\u0000${sample.color}`;
    let color = sample.color;
    if (byKey.has(k)) {
      const to = byKey.get(k);
      changed++;
      if (to === null) continue;
      color = to;
    }
    const finalKey = `${sample.product}\u0000${color}`;
    if (seen.has(finalKey)) continue;
    seen.add(finalKey);
    out.push(color === sample.color ? sample : { ...sample, color });
  }
  return { samples: out, changed };
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
    // a product with no real color options has no `colors` key at all (no swatches, no color step)
    ...(product.colors.length > 0 ? { colors: product.colors } : {}),
    // size-priced products carry the note the product page shows under the price
    ...(product.priceNote ? { priceNote: product.priceNote } : {}),
  };
}
