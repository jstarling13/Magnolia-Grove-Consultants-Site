/**
 * Approximate CSS colors for supplier color names, so the catalog can show
 * a visual swatch instead of plain text. This is a best-effort visual aid —
 * the real color name is always shown alongside it (aria-label, title and
 * visible text), since compound/Pantone-style supplier names ("Heathered
 * Vista Blue", "Cottage Blue 293 C") can't be rendered exactly without
 * per-color photos.
 *
 * Resolution order for a name:
 *   1. strip supplier UI debris ("... Show less") and normalise
 *   2. two/three-tone names ("Black/Gray", "Azure_White", "Black-Gray")
 *      become a split swatch when every part is a recognisable color
 *   3. "assorted"/"multi" become a multi-color swatch
 *   4. otherwise the longest matching color phrase wins ("heather gray"
 *      beats "gray"); "light"/"dark" modifiers shift the result
 *   5. anything we cannot place falls back to a neutral swatch that the UI
 *      draws with a dashed ring so it never looks like a real color
 */

/** Color phrase -> hex. Matching is whole-word and longest-phrase-first. */
const COLOR_KEYWORDS: Record<string, string> = {
  // blues
  "navy blue": "#1b2a4a",
  navy: "#1b2a4a",
  midnight: "#141b33",
  "royal blue": "#2748c0",
  royal: "#2748c0",
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
  purple: "#6a3e9c",
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
};

const FALLBACK_COLOR = "#e4e0d6";
const MULTI_COLORS = ["#c8102e", "#f4d03f", "#2f6b3a", "#2a63c7"];
const MULTI_PATTERN = /\b(assorted|multi|multicolou?r|rainbow)\b/;
const MAX_TONES = 3;

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

function normalizePhrase(phrase: string): string {
  return phrase.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}

/** Resolves one color phrase (no tone separators) to a hex, or null if unknown. */
function resolveSingle(phrase: string): string | null {
  const text = normalizePhrase(phrase);
  const heathered = /\bheather(ed)?\b/.test(text);
  for (const [keyword, pattern, hex] of KEYWORD_PATTERNS) {
    if (!pattern.test(text)) continue;
    let result = hex;
    // Modifiers only apply when the matched phrase doesn't already include them.
    if (!keyword.includes("dark") && /\bdark\b/.test(text)) result = mix(result, [0, 0, 0], 0.35);
    else if (!keyword.includes("light") && /\blight\b/.test(text))
      result = mix(result, [255, 255, 255], 0.4);
    if (heathered && !keyword.includes("heather")) result = mix(result, [189, 189, 189], 0.25);
    return result;
  }
  return heathered ? "#a8a8a8" : null;
}

function splitTones(name: string): string[] | null {
  const bySeparator = name.split(/\s*(?:\/|_|&|\s+w\/\s*|\s+with\s+)\s*/i).filter(Boolean);
  if (bySeparator.length > 1) return bySeparator;
  // A hyphen is ambiguous ("Black-Gray" vs "Navy-Blue"): only split when the
  // whole name isn't itself one known color phrase.
  if (normalizePhrase(name) in COLOR_KEYWORDS) return null;
  const byHyphen = name.split(/\s*-\s*/).filter(Boolean);
  return byHyphen.length > 1 ? byHyphen : null;
}

export function swatchInfo(rawName: string): SwatchInfo {
  const name = cleanColorName(rawName);
  const lower = name.toLowerCase();

  if (MULTI_PATTERN.test(lower)) return { kind: "multi", colors: MULTI_COLORS };

  const parts = splitTones(name);
  if (parts) {
    const resolved = parts
      .slice(0, MAX_TONES)
      .map(resolveSingle)
      .filter((hex): hex is string => hex !== null);
    if (resolved.length >= 2) return { kind: "split", colors: resolved };
    // A hyphenated single color ("Heather-Gray") falls through to a whole-name match.
  }

  const single = resolveSingle(name);
  if (single) return { kind: "solid", colors: [single] };
  return { kind: "unknown", colors: [FALLBACK_COLOR] };
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
