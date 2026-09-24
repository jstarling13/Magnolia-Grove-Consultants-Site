/**
 * Approximate CSS colors for supplier color names, so the catalog can show
 * a visual swatch instead of plain text. This is a best-effort visual aid —
 * the real color name is always shown alongside it (title attribute + text),
 * since compound/Pantone-style supplier names ("Heathered Vista Blue",
 * "Cottage Blue 293 C") can't be rendered exactly without per-color photos.
 */

// Longer/more specific phrases first so e.g. "light blue" wins over "blue".
const COLOR_KEYWORDS: [string, string][] = [
  ["light blue", "#a9c9e6"],
  ["sky blue", "#8fc3e8"],
  ["baby blue", "#a9d3e8"],
  ["powder blue", "#b7d4e6"],
  ["royal blue", "#2748c0"],
  ["navy blue", "#1b2a4a"],
  ["reflex blue", "#0033a0"],
  ["cobalt", "#1e4fa3"],
  ["teal", "#1f7a7a"],
  ["turquoise", "#30b0b0"],
  ["aqua", "#3fbfbf"],
  ["mint", "#93d8bd"],
  ["seafoam", "#93d8bd"],
  ["sea glass", "#a4d0c4"],
  ["navy", "#1b2a4a"],
  ["royal", "#2748c0"],
  ["carolina blue", "#7bafd4"],
  ["blue", "#2a63c7"],
  ["heather grey", "#9a9a9a"],
  ["heather gray", "#9a9a9a"],
  ["charcoal", "#3b3b3b"],
  ["graphite", "#42413f"],
  ["gray", "#8b8b8b"],
  ["grey", "#8b8b8b"],
  ["silver", "#c7c9cc"],
  ["titanium", "#8a8d8f"],
  ["platinum", "#c9c9c9"],
  ["black", "#111111"],
  ["jet ", "#1a1a1a"],
  ["white", "#fafafa"],
  ["ivory", "#f7f3e9"],
  ["cream", "#f5efd9"],
  ["bright red", "#e0202c"],
  ["cherry red", "#c8102e"],
  ["cardinal", "#a6192e"],
  ["maroon", "#6f2c3f"],
  ["burgundy", "#6d0e23"],
  ["red", "#c8102e"],
  ["hot pink", "#e6399b"],
  ["bliss pink", "#f2a7c3"],
  ["pink", "#e893b4"],
  ["orange", "#e8732c"],
  ["gold", "#c8a951"],
  ["yellow", "#f4d03f"],
  ["forest green", "#284b33"],
  ["kelly green", "#3c9a5f"],
  ["hunter green", "#2e4d3a"],
  ["olive", "#6b6b3a"],
  ["lime", "#8fbf3f"],
  ["green", "#2f6b3a"],
  ["purple", "#6a3e9c"],
  ["lavender", "#b99ad4"],
  ["khaki", "#c3b091"],
  ["tan", "#d2b48c"],
  ["sand", "#d8c6a1"],
  ["stone", "#a79e8e"],
  ["natural", "#ede6d6"],
  ["brown", "#6b4a32"],
  ["walnut", "#5a3f2e"],
  ["chocolate", "#4a2f22"],
  ["saddle", "#7a4a2b"],
  ["coral", "#e8765c"],
  ["peach", "#f2b489"],
];

const FALLBACK_COLOR = "#c9c2b2";

export function swatchColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, color] of COLOR_KEYWORDS) {
    if (lower.includes(keyword)) return color;
  }
  return FALLBACK_COLOR;
}
