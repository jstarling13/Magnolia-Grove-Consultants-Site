/**
 * Approximate CSS colors for supplier color names, so the catalog can show
 * a visual swatch instead of plain text. This is a best-effort visual aid —
 * the real color name is always shown alongside it (aria-label, title and
 * visible text), since compound/Pantone-style supplier names ("Heathered
 * Vista Blue", "Cottage Blue 293 C") can't be rendered exactly without
 * per-color photos.
 *
 * Resolution order for a name:
 *   1. strip supplier UI debris ("... Show less"), a trailing vendor code
 *      ("Navy-040", "Black Heather - 104", "Cottage Blue 293 C", "Navy (A)")
 *      and normalise case/whitespace/punctuation; displayed names never change
 *   2. "assorted"/"multi"/"various"/"stock colors" become a multi-color swatch
 *   3. an exact vendor name (NAMED_COLORS) wins: these hexes were sampled from
 *      the per-color product photos or are a documented color-standard value
 *   4. two/three-tone names ("Black/Gray", "Azure_White", "Black-Gray",
 *      "White Blue") become a split swatch when EVERY part is recognisable;
 *      a name with an unrecognisable part stays unknown rather than showing
 *      half of what it says
 *   5. otherwise the longest matching color phrase wins ("heather gray"
 *      beats "gray") and a specific hue ("mint") beats a bare base color
 *      ("green") in "Mint Green"; "light"/"dark"/"heather"/"clear" shift it
 *   6. anything we cannot place falls back to a neutral swatch that the UI
 *      draws with a dashed ring so it never looks like a real color
 *
 * Evidence: __tests__/fixtures/colorPhotoSamples.json holds the dominant colors
 * sampled from every per-color photo (scripts/colorCoverage.mjs --sample), and
 * __tests__/colorSwatches.coverage.test.ts fails if a mapping drifts away from
 * what a photo shows or if coverage of the live catalog drops below 98%.
 */

/** Color phrase -> hex. Matching is whole-word and longest-phrase-first. */
const COLOR_KEYWORDS: Record<string, string> = {
  // blues
  "navy blue": "#1b2a4a",
  navy: "#1b2a4a",
  midnight: "#141b33",
  "royal blue": "#2a50a8",
  royal: "#2a50a8",
  "carolina blue": "#7bafd4",
  carolina: "#7bafd4",
  "columbia blue": "#8db9e0",
  "light blue": "#a9c9e6",
  "sky blue": "#8fc3e8",
  sky: "#8fc3e8",
  "baby blue": "#a9d3e8",
  "powder blue": "#b7d4e6",
  "ice blue": "#cfe3f1",
  "reflex blue": "#0033a0",
  "process blue": "#0085ca",
  "neon blue": "#1f51ff",
  cobalt: "#1e4fa3",
  denim: "#4a6d96",
  indigo: "#3f3d8f",
  azure: "#1f8ceb",
  blue: "#2a63c7",
  // greens / teals
  teal: "#1f7a7a",
  turquoise: "#30b0b0",
  aqua: "#3fbfbf",
  mint: "#93d8bd",
  seafoam: "#93d8bd",
  "sea glass": "#a4d0c4",
  jade: "#2a9d6f",
  emerald: "#1f8a5b",
  "neon green": "#39e639",
  "safety green": "#a5e600",
  "forest green": "#284b33",
  forest: "#284b33",
  "kelly green": "#3c9a5f",
  kelly: "#3c9a5f",
  "hunter green": "#2e4d3a",
  hunter: "#2e4d3a",
  "army green": "#4b5320",
  "military green": "#4b5320",
  army: "#4b5320",
  olive: "#6b6b3a",
  moss: "#6b7a3a",
  sage: "#9caf88",
  "lime green": "#8fbf3f",
  lime: "#8fbf3f",
  green: "#2f6b3a",
  // grays / neutrals
  "heather gray": "#9a9a9a",
  "heather grey": "#9a9a9a",
  charcoal: "#3b3b3b",
  graphite: "#42413f",
  gunmetal: "#4a4f55",
  slate: "#5d6b7a",
  steel: "#7a8591",
  pewter: "#8e9094",
  smoke: "#8a8a8a",
  carbon: "#2b2b2b",
  ash: "#b2b2b2",
  gray: "#8b8b8b",
  grey: "#8b8b8b",
  silver: "#c7c9cc",
  titanium: "#8a8d8f",
  platinum: "#c9c9c9",
  black: "#111111",
  onyx: "#0f0f0f",
  jet: "#1a1a1a",
  white: "#fafafa",
  snow: "#fbfbfb",
  "off white": "#f4f1ea",
  ivory: "#f7f3e9",
  cream: "#f5efd9",
  bone: "#e6dfcf",
  clear: "#eef2f4",
  frost: "#e4edf2",
  // reds / pinks
  "bright red": "#e0202c",
  "cherry red": "#c8102e",
  cherry: "#b3122c",
  cardinal: "#a6192e",
  maroon: "#6f2c3f",
  burgundy: "#6d0e23",
  wine: "#722f37",
  crimson: "#b0122b",
  scarlet: "#d1202f",
  garnet: "#7a1f2b",
  ruby: "#a1122c",
  brick: "#9c3a2b",
  rust: "#a6451f",
  red: "#c8102e",
  "hot pink": "#e6399b",
  "neon pink": "#ff3d9a",
  "bliss pink": "#f2a7c3",
  blush: "#f2c6cf",
  rose: "#d9677f",
  fuchsia: "#d1349a",
  magenta: "#c2208a",
  salmon: "#f08a77",
  coral: "#e8765c",
  peach: "#f2b489",
  pink: "#e893b4",
  // oranges / yellows / golds
  "neon orange": "#ff6a13",
  "safety orange": "#ff6700",
  "burnt orange": "#bf5700",
  tangerine: "#f28500",
  orange: "#e8732c",
  "old gold": "#cfb53b",
  "vegas gold": "#c5b358",
  gold: "#c8a951",
  "neon yellow": "#e8f50a",
  "safety yellow": "#e5f021",
  yellow: "#f4d03f",
  // purples
  purple: "#5a3f8c",
  violet: "#7f3fbf",
  plum: "#6e3a5e",
  grape: "#5e2a84",
  lavender: "#b99ad4",
  lilac: "#c8a2c8",
  // browns / earth
  khaki: "#c3b091",
  tan: "#d2b48c",
  sand: "#d8c6a1",
  stone: "#a79e8e",
  natural: "#ede6d6",
  beige: "#d9c7a6",
  oatmeal: "#d3c4a8",
  wheat: "#e0c58f",
  taupe: "#8b7d6b",
  camel: "#c19a6b",
  bronze: "#9c6b30",
  "rose gold": "#b76e79",
  copper: "#b87333",
  cognac: "#9a4a1f",
  chestnut: "#7b4a2a",
  mocha: "#6f4e37",
  coffee: "#4b2e1f",
  espresso: "#3b2418",
  mahogany: "#4e1f13",
  brown: "#6b4a32",
  walnut: "#5a3f2e",
  chocolate: "#4a2f22",
  saddle: "#7a4a2b",
  "castle rock": "#8f9396",
  // ---- additions (second pass: bags, tech, drinkware, event, home, outdoor) ----
  eggplant: "#614051",
  granite: "#676767",
  cerulean: "#2a7fba",
  champagne: "#f3e2c4",
  fuschia: "#d1349a",
  marigold: "#eaa221",
  blueberry: "#44519a",
  teakwood: "#a47c48",
  chalk: "#ececea",
  elephant: "#8b8d90",
  grasshopper: "#8ab43c",
  "angel food": "#f6edd3",
  "cambridge blue": "#a3c1ad",
  "cornflower blue": "#6495ed",
  "fluorescent blue": "#1f51ff",
  "cherry blossom": "#f1c5cf",
  "robbins egg": "#8dd3d0",
  "robin egg": "#8dd3d0",
  "hot green": "#1fbf4a",
  // ---- additions: standard color words seen in the vendor catalog ----
  // blues / teals
  sapphire: "#1b66c7",
  laguna: "#2a8f9a",
  seaspray: "#a8d5d1",
  cyan: "#12b5cb",
  petrol: "#1f5560",
  "robin's egg": "#8dd3d0",
  columbia: "#8db9e0",
  reflex: "#0033a0",
  rainwater: "#9fb1ba",
  // greens
  spruce: "#2f5a48",
  evergreen: "#1f4d3a",
  "pine tree": "#2a4a35",
  pinetree: "#2a4a35",
  pine: "#2a4a35",
  loden: "#46503a",
  cypress: "#3d5a3f",
  palmetto: "#4f7a4c",
  kiwi: "#8ec63f",
  pistachio: "#bfd68f",
  // grays / neutrals
  iron: "#5a5d62",
  storm: "#5d6d7e",
  cement: "#9a9a96",
  fog: "#c9ccce",
  putty: "#b8aa95",
  quarry: "#7b7d7b",
  anthracite: "#43484d",
  limestone: "#d6d1c4",
  "light oxford": "#b6b8ba",
  ltoxf: "#b6b8ba",
  ltoxford: "#b6b8ba",
  oxford: "#8e9296",
  chrome: "#d0d2d5",
  nickel: "#a8a9ad",
  // reds / pinks / purples
  port: "#5c1a33",
  vineyard: "#6e2c4e",
  huckleberry: "#4a3c6b",
  mauve: "#b07a99",
  oxblood: "#4a1c1c",
  azalea: "#e8588a",
  heliconia: "#e0197d",
  "bubble gum": "#f4a6c8",
  iris: "#7189d8",
  orchid: "#e3b5d9",
  // oranges / yellows / golds
  autumn: "#c4622d",
  pumpkin: "#e87722",
  "mango tango": "#ff8243",
  nectarine: "#f4a46a",
  apricot: "#f6c394",
  cantaloupe: "#f5a05a",
  melon: "#f27d7e",
  terracotta: "#c0623f",
  canyon: "#b5603a",
  mustard: "#e1ad01",
  goldenrod: "#daa520",
  dandelion: "#f6d54a",
  canary: "#fbe74a",
  daisy: "#f9e04b",
  cornsilk: "#f4e8b3",
  "prairie dust": "#c2a15a",
  brass: "#b5a642",
  "antique brass": "#a08a4a",
  // browns / earth
  clay: "#b0654a",
  teak: "#a47c48",
  sepia: "#704214",
  "burnt sienna": "#e97451",
  "raw sienna": "#d68a59",
  tumbleweed: "#deaa88",
  grizzly: "#6b4a32",
  driftwood: "#a89678",
  dune: "#d0bd9a",
  almond: "#e2d1ac",
  bamboo: "#d8c08c",
  biscuit: "#e0c9a6",
  caramel: "#c68642",
  sandstone: "#cdb591",
};

/**
 * Exact vendor color names (normalised: lowercase, single spaces, no hyphens)
 * -> hex, or several hexes for a two/three-tone item. Checked before the
 * keyword table, with and without the trailing vendor code.
 *
 * Source of each group is noted. "photo" values are the dominant item color
 * sampled from that name's product photo (see colorPhotoSamples.json); the
 * rest are standard color knowledge for names that are an ordinary color word
 * the keyword table would otherwise misread (e.g. "stone blue" is blue, not
 * stone). Names that are only marketing copy are deliberately NOT listed.
 */
export const NAMED_COLORS: Record<string, string | readonly string[]> = {
  // photo: Nike
  anthracite: "#43484d",
  "team anthracite": "#3d4242",
  "blue tint": "#ddecef",
  "brilliant orange": "#ea521a",
  "cool grey": "#81848a",
  "court purple": "#4b3674",
  "game royal": "#0942a2",
  "gorge green": "#17472b",
  "gym blue": "#0c4389",
  "lucid green": "#049c5e",
  "tidal blue": "#0aa6be",
  "university red": "#cc1f45",
  "urban lilac": "#cdbbe1",
  "valor blue": "#5d85c0",
  "varsity maize": "#e9ba28",
  "vivid pink": "#e34592",
  "team black": "#262827",
  "team dark green": "#245235",
  "team light blue": "#8bb7d5",
  "team navy": "#1e2b3e",
  "team red": "#8a1c34",
  "team royal": "#1e5194",
  "team scarlet": "#b42029",
  // photo: Adidas
  "bliss pink": "#fd879d",
  "blue fusion": "#8bafe8",
  "clear mint": "#bbd9c8",
  "collegiate gold": "#f0a81c",
  "collegiate green": "#17513f",
  "collegiate navy": "#25344f",
  "collegiate purple": "#403076",
  "collegiate red": "#cb1b24",
  "collegiate royal": "#0b4090",
  "core white": "#eaeaea",
  "grey five": "#666569",
  "grey three": "#949498",
  "grey three melange": "#a3a4a8",
  "halo blue": "#ced5dd",
  onix: "#5e666d",
  "power red": "#b90a2a",
  "silver pebble": "#989183",
  "black heather": "#7f7c7d",
  // photo: Brooks Brothers / Zen / Storm Creek / Johnnie-O style polos and layers
  "charter blue": "#2f5d88",
  "navy blazer": "#222d39",
  "rich red": "#8c2220",
  "soft mint": "#89ced2",
  "deep black": "#222627",
  "deep maroon": "#6d3334",
  "sport red": "#bc2c38",
  "titanium gray": "#37424e",
  "platinum gray": "#cbcdd0",
  // photo: Bella+Canvas / Gildan / Port & Company tees
  "heather columbia blue": "#7e9eda",
  "heather deep teal": "#5b8299",
  "heather forest": "#3f5f58",
  "heather maroon": "#895a6c",
  "heather navy": "#2e3b4e",
  "heather olive": "#9e937f",
  "heather red": "#e33852",
  "heather slate": "#697b89",
  "heather true royal": "#3a5fa5",
  "athletic heather": "#aeb1b6",
  athletic: "#aeb1b6",
  asphalt: "#606367",
  leaf: "#5e9963",
  "deep teal": "#01695b",
  "ocean blue": "#4ba3d3",
  "steel blue": "#547798",
  "stone blue": "#6e8ca4",
  "maize yellow": "#ce9a36",
  "texas orange": "#bf6a2c",
  "oxblood black": "#2e1b26",
  "soft cream": "#d3c6b5",
  "soft pink": "#e8bbc3",
  "black sand": "#575659",
  "navy heather": "#404d66",
  "sport gray": "#b0adaf",
  melon: "#f27d7e",
  dill: "#536958",
  saddle: "#cd9a68",
  "light pink": "#f6d0dc",
  "heather dust": "#cbbfb4",
  "deep heather": "#5b5f63",
  // photo: Cayak hoodie (the "- 104" style codes are part of the vendor name)
  "black heather 104": "#2e2f33",
  "blue heather 293": "#4469a7",
  "blue lavender heather 147": "#bcc9e7",
  "burgundy heather 128": "#673843",
  "coral heather 359": "#f2939d",
  "dark grey heather 511": "#3b3c3b",
  "light grey heather 514": "#ccd5d8",
  "navy heather 240": "#323d47",
  "seafoam heather 235": "#b9e3de",
  "spruce heather 190": "#729595",
  // photo: caps, mugs, backpacks
  "shy marshmallow": "#d1d2ce",
  "very very dark": "#1c1c1e",
  "iceberg heather": "#b9bcc0",
  "jet gray": "#4e5054",
  "cobalt blue": "#1d2f8c",
  // vendor shorthand / generic labels with an unambiguous color meaning
  "dark heather": "#656565",
  "coal heather": "#4a4a4a",
  iceberg: "#b9bcc0",
  frosted: "#e4edf2",
  metblue: "#2a63c7",
  // name-implied, approximate: the name itself describes the hue (sand, deep
  // blue, pale water) but no photo or vendor chart was available to confirm it
  beach: "#d8c6a1",
  "deep harbor": "#27425e",
  pond: "#5f8f94",
  breeze: "#a9cfe0",
  "coastal mist": "#b9c9cf",
  "calm waters": "#8fc1cf",
  "coastal fjord": "#3f6b7c",
  "lightly toasted": "#d9bf94",
  // Pantone chips whose number matters (the code is part of the shade)
  "cool grey 6": "#a7a8aa",
  "cool grey 8": "#888b8d",
  "warm grey 1": "#d7d2cb",
  "pink red pms 193": "#bf0f3e",
  "dark white white c": "#fafafa",
  // two/three-tone names the splitter cannot read
  "dune warm gray black": ["#b5aea4", "#111111"],
  "blue reflex": "#0033a0",
  "blue reflex white": ["#0033a0", "#fafafa"],
  "iceberg heather black": ["#b9bcc0", "#111111"],
  "iceberg heather navy": ["#b9bcc0", "#1b2a4a"],
  "maroon gray": ["#6f2c3f", "#8b8b8b"],
  "dark brown sandstone": ["#463021", "#cdb591"],
  "recycled silver with clear": ["#c7c9cc", "#eef2f4"],
  "stainless steel": "#a9adb1",
};

const FALLBACK_COLOR = "#e4e0d6";
const MULTI_COLORS = ["#c8102e", "#f4d03f", "#2f6b3a", "#2a63c7"];
/**
 * "assorted"/"multi" and the supplier labels that mean "several colors to pick
 * from" ("Various", "Stock Colors", "Full Digital Printing" ...). Checked
 * against the normalised name. A bare "Custom" is NOT here: it names no color.
 */
const MULTI_PATTERN =
  /\b(assorted|multi|multicolou?r|rainbow|various)\b|^(any all colors|all colors|stock colors|custom colors|custom shell colors|full digital printing|custom full color print|pms color match|full imprint avail|fullcolor avail|cmyk)$/;
const MAX_TONES = 3;
const HEATHER_NEUTRAL = "#a8a8a8";

/** Bare base colors lose to a more specific hue word ("mint green" is mint). */
const BASE_COLORS = new Set([
  "blue",
  "green",
  "red",
  "orange",
  "yellow",
  "purple",
  "pink",
  "brown",
  "gray",
  "grey",
  "black",
  "white",
]);

/** Words that describe the item, not its color, when they stand alone in a part. */
const NOISE_PARTS = new Set(["jersey"]);

/** Camouflage is a pattern, so it is drawn as its typical tones. */
const CAMO_TONES = {
  woodland: ["#4b5a2f", "#6b5436", "#2b2f20"],
  desert: ["#c9b38a", "#9c8460", "#e0d2b0"],
  arid: ["#bfae88", "#8d8e6d", "#6f6b50"],
  digital: ["#6f7a63", "#4f5a48", "#9aa38b"],
} as const;

// Phrases sorted longest-first so "heather gray" is tried before "gray".
const SORTED_KEYWORDS = Object.keys(COLOR_KEYWORDS).sort((a, b) => b.length - a.length);
const KEYWORD_PATTERNS = SORTED_KEYWORDS.map(
  (keyword) =>
    [keyword, new RegExp(`(?:^|[^a-z])${keyword}(?:[^a-z]|$)`), COLOR_KEYWORDS[keyword]] as const
);

export type SwatchKind = "solid" | "split" | "multi" | "unknown";

export interface SwatchInfo {
  kind: SwatchKind;
  /** One color for solid/unknown, 2-3 for split, several for multi. */
  colors: string[];
}

/**
 * Strips supplier-page debris that occasionally leaks into scraped color
 * names (a trailing "Show less"/"Show more" expander label) and collapses
 * whitespace. Always run names through this before comparing or keying.
 */
export function cleanColorName(name: string): string {
  return name
    .replace(/\s*show\s+(more|less)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const mixed = channels.map((channel, index) =>
    Math.round(channel + (target[index] - channel) * amount)
      .toString(16)
      .padStart(2, "0")
  );
  return `#${mixed.join("")}`;
}

const ABBREVIATIONS: Record<string, string> = {
  lt: "light",
  dk: "dark",
  brt: "bright",
  brite: "bright",
  blk: "black",
};

/**
 * Lowercases, turns every punctuation run into one space, and expands the
 * vendor abbreviations ("Lt Blue", "Brt Navy"). Digits and apostrophes stay.
 */
function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, " ")
    .trim()
    .split(" ")
    .map((word) => ABBREVIATIONS[word] ?? word)
    .join(" ");
}

/** Drops a trailing vendor code: "navy 040", "black heather 104", "blue 293 c", "red 3". */
function stripCode(text: string): string {
  const stripped = text.replace(/\s+\d{1,4}(?:\s+c)?$/, "").trim();
  return stripped || text;
}

/** Removes a trailing "(A)" variant letter; the displayed name is never touched. */
function withoutVariantLetter(name: string): string {
  return name.replace(/\s*\(\s*[a-z]\s*\)\s*$/i, "");
}

/**
 * Canonical key for a color name: case, whitespace, punctuation, a trailing
 * vendor code and a trailing "(A)" variant letter all removed. Names with the
 * same key resolve to the same swatch.
 */
export function colorKey(rawName: string): string {
  return stripCode(normalizePhrase(withoutVariantLetter(cleanColorName(rawName))));
}

function namedColor(text: string): string | readonly string[] | undefined {
  return NAMED_COLORS[text] ?? NAMED_COLORS[stripCode(text)];
}

function findKeyword(text: string): { keyword: string; hex: string } | null {
  let base: { keyword: string; hex: string } | null = null;
  for (const [keyword, pattern, hex] of KEYWORD_PATTERNS) {
    if (!pattern.test(text)) continue;
    if (!BASE_COLORS.has(keyword)) return { keyword, hex };
    base ??= { keyword, hex };
  }
  return base;
}

/** Translucent plastics read as a washed-out version of their color. */
const TRANSLUCENT = /^(?:clear|translucent|transparent|frosted)\s+(.+)$/;

/** Resolves one color phrase (no tone separators) to a hex, or null if unknown. */
function resolveSingle(phrase: string): string | null {
  const text = stripCode(normalizePhrase(phrase)).replace(/\s+lid$/, "");
  const named = namedColor(text);
  if (typeof named === "string") return named;

  const translucent = TRANSLUCENT.exec(text);
  if (translucent && translucent[1] !== "clear") {
    const rest = resolveSingle(translucent[1]);
    if (rest) return mix(rest, [255, 255, 255], 0.35);
  }

  const found = findKeyword(text);
  if (!found) return null;
  const { keyword } = found;
  let result = found.hex;
  // Modifiers only apply when the matched phrase doesn't already include them.
  if (!keyword.includes("dark") && /\bdark\b/.test(text)) result = mix(result, [0, 0, 0], 0.35);
  else if (!keyword.includes("light") && /\blight\b/.test(text))
    result = mix(result, [255, 255, 255], 0.4);
  if (/\bheather(ed)?\b/.test(text) && !keyword.includes("heather"))
    result = mix(result, [189, 189, 189], 0.25);
  return result;
}

const CAMO_WORDS = /\b(camouflage|camo\d*|digital|woodland|desert|arid|terrain|classic|urban)\b/g;

/** A pattern name ("Woodland Camouflage") with no color in it becomes a tone set. */
function resolveCamo(text: string): readonly string[] | null {
  if (!/\bcamo(uflage)?\d*\b/.test(text)) return null;
  const rest = text.replace(CAMO_WORDS, " ").replace(/\s+/g, " ").trim();
  if (rest && resolveSingle(rest)) return null;
  if (/\bdesert\b/.test(text)) return CAMO_TONES.desert;
  if (/\barid\b/.test(text)) return CAMO_TONES.arid;
  if (/\bdigital\b/.test(text)) return CAMO_TONES.digital;
  return CAMO_TONES.woodland;
}

/** All tones of one separator-free phrase: several for named/camo/"white blue" items, else one. */
function resolvePhrase(phrase: string): string[] | null {
  const text = stripCode(normalizePhrase(phrase));
  const named = namedColor(text);
  if (Array.isArray(named)) return [...named];
  // A bare "Heather" part ("Heather-White") is the neutral heather tone.
  if (text === "heather") return [HEATHER_NEUTRAL];
  const camo = resolveCamo(text);
  if (camo) return [...camo];

  // "White Blue", "White Translucent Red": a white body with a colored part.
  const whiteWith = /^white\s+(.+)$/.exec(text);
  if (whiteWith && !named) {
    const rest = resolveSingle(whiteWith[1]);
    const white = resolveSingle("white");
    if (rest && white) return rest === white ? [white] : [white, rest];
  }

  const single = resolveSingle(text);
  return single ? [single] : null;
}

function resolveParts(parts: string[]): string[] | null {
  const meaningful = parts.filter((part) => !NOISE_PARTS.has(normalizePhrase(part)));
  if (meaningful.length === 0) return null;
  const tones: string[] = [];
  for (const part of meaningful) {
    const resolved = resolvePhrase(part);
    if (!resolved) return null;
    tones.push(...resolved);
  }
  return tones;
}

const UNKNOWN: SwatchInfo = { kind: "unknown", colors: [FALLBACK_COLOR] };

function toInfo(tones: string[]): SwatchInfo {
  const distinct = tones.filter((tone, index) => tones.indexOf(tone) === index);
  if (distinct.length === 1) return { kind: "solid", colors: distinct };
  return { kind: "split", colors: distinct.slice(0, MAX_TONES) };
}

export function swatchInfo(rawName: string): SwatchInfo {
  const name = withoutVariantLetter(cleanColorName(rawName));
  const key = stripCode(normalizePhrase(name));

  if (MULTI_PATTERN.test(key)) return { kind: "multi", colors: MULTI_COLORS };

  // Exact vendor names beat everything, including a "-" that looks like a separator.
  const named = namedColor(normalizePhrase(name));
  if (named) return toInfo(typeof named === "string" ? [named] : [...named]);

  // Explicit separators ("/", "_", "&", "w/", "with") always mean several parts.
  const bySeparator = stripCode(name)
    .split(/\s*(?:\/|_|&|\s+w\/\s*|\s+with\s+)\s*/i)
    .filter(Boolean);
  if (bySeparator.length > 1) {
    const tones = resolveParts(bySeparator);
    return tones ? toInfo(tones) : UNKNOWN;
  }

  // A hyphen is ambiguous ("Black-Gray" vs "Navy-Blue" vs "Blue-Reflex"): use the
  // whole name when it is itself a known phrase, else the parts, else reversed.
  const byHyphen = stripCode(name)
    .split(/\s*-\s*/)
    .filter(Boolean);
  if (byHyphen.length > 1) {
    const whole = resolvePhrase(key);
    if (whole && (key in COLOR_KEYWORDS || namedColor(key))) return toInfo(whole);
    const tones = resolveParts(byHyphen);
    if (tones) return toInfo(tones);
    const reversed = resolvePhrase([...byHyphen].reverse().join(" "));
    if (reversed) return toInfo(reversed);
    return whole ? toInfo(whole) : UNKNOWN;
  }

  const tones = resolvePhrase(key);
  return tones ? toInfo(tones) : UNKNOWN;
}

/** CSS `background` value for a swatch: solid, hard-stop diagonal split, or conic. */
export function swatchBackground(info: SwatchInfo): string {
  const [first, ...rest] = info.colors;
  if (info.kind === "multi") {
    const step = 100 / info.colors.length;
    const stops = info.colors
      .map((color, index) => `${color} ${index * step}% ${(index + 1) * step}%`)
      .join(", ");
    return `conic-gradient(${stops})`;
  }
  if (info.kind === "split") {
    const step = 100 / info.colors.length;
    const stops = [first, ...rest]
      .map(
        (color, index) =>
          `${color} ${(index * step).toFixed(2)}% ${((index + 1) * step).toFixed(2)}%`
      )
      .join(", ");
    return `linear-gradient(135deg, ${stops})`;
  }
  return first;
}

/** Back-compat helper: the (first) display color for a name. */
export function swatchColor(name: string): string {
  return swatchInfo(name).colors[0];
}
