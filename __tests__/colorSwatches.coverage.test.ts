/**
 * Live-catalog checks for src/lib/colorSwatches.ts:
 *   - coverage: how much of the catalog's real color names get a real swatch
 *     instead of the neutral dashed-ring fallback (must stay >= 98%)
 *   - the intentionally-unmapped list (names that are marketing copy, shorthand
 *     we cannot decode, or not a color at all)
 *   - no mapping may contradict what a per-color product photo shows
 *
 * `node scripts/colorCoverage.mjs --report` runs this file with a printed report.
 * Photo evidence lives in fixtures/colorPhotoSamples.json, regenerated with
 * `node scripts/colorCoverage.mjs --sample`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { products } from "@/config/merchandiseConfig";
import { swatchInfo } from "@/lib/colorSwatches";

const MIN_OCCURRENCE_COVERAGE = 0.98;

/**
 * Names that deliberately keep the neutral dashed ring. Adding a name here
 * should be a conscious call: prefer mapping it (photo, vendor chart or a
 * standard color word) over listing it.
 */
const INTENTIONALLY_UNMAPPED: Record<string, string> = {
  // Not a color at all.
  Custom: "print/decoration option, names no color",
  Sublimated: "decoration method, names no color",
  // Marketing names with no color meaning and no photo or vendor chart to read from.
  "80'S Ski Slope": "Owala marketing name",
  Beachfront: "Owala marketing name",
  "Nailed It": "Owala marketing name",
  "Read My Lips": "Owala marketing name",
  "Rock On": "Owala marketing name",
  "Sea Captain": "Owala marketing name",
  "Sugar High": "Owala marketing name",
  "Summer Paradise": "Owala marketing name",
  "Tangy Tango": "Owala marketing name",
  Harvest: "RTIC marketing name",
  Trailblazer: "RTIC marketing name",
  Macaroon: "Imperial marketing name, no color reading",
  Ceylon: "Under Armour marketing name",
  Sequoia: "Johnnie-O name that could be bark-red or tree-green",
  Bayou: "Johnnie-O name, hue unclear",
  Tradewinds: "Callaway name, hue unclear",
  Deep: "truncated vendor name, base color lost",
  "Heathered Windsor": "heather of an unreadable base (Windsor blue or purple)",
  "Heathered Paget": "heather of an unreadable base",
  // Vendor abbreviations whose second part cannot be decoded; a half-swatch would mislead.
  "Red Flap/Blkred Blanket": "undecodable abbreviation (Blkred)",
  "Nav Flap/Grnnav Blanket": "undecodable abbreviation (Grnnav)",
  "Nav Flap/Navwht Blanket": "undecodable abbreviation (Navwht)",
  "Blk Flap/Blkgra Blanket": "undecodable abbreviation (Blkgra)",
};

function catalogColorCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const product of products) {
    for (const color of product.colors ?? []) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return counts;
}

function coverage() {
  const counts = catalogColorCounts();
  let total = 0;
  let unmappedOccurrences = 0;
  const unmapped: string[] = [];
  for (const [name, count] of counts) {
    total += count;
    if (swatchInfo(name).kind === "unknown") {
      unmappedOccurrences += count;
      unmapped.push(name);
    }
  }
  return {
    names: counts.size,
    unmappedNames: unmapped.sort(),
    occurrences: total,
    unmappedOccurrences,
    occurrenceCoverage: total ? 1 - unmappedOccurrences / total : 1,
  };
}

describe("swatch coverage of the live catalog", () => {
  it("covers at least 98% of color-name occurrences with a real swatch", () => {
    const result = coverage();
    if (process.env.COLOR_COVERAGE_REPORT) {
      const pct = (result.occurrenceCoverage * 100).toFixed(2);
      const nameShare = (1 - result.unmappedNames.length / result.names) * 100;
      console.log(
        `Color coverage: ${pct}% of ${result.occurrences} occurrences ` +
          `(${nameShare.toFixed(1)}% of ${result.names} distinct names)\n` +
          `Unmapped (${result.unmappedNames.length}): ${result.unmappedNames.join(" | ")}`
      );
    }
    expect(
      result.occurrenceCoverage,
      `unmapped: ${result.unmappedNames.join(", ")}`
    ).toBeGreaterThanOrEqual(MIN_OCCURRENCE_COVERAGE);
    expect(result.occurrences).toBeGreaterThan(1000);
  });

  it("only leaves intentionally-listed names unmapped when they are in the catalog", () => {
    const { unmappedNames } = coverage();
    const unexpected = unmappedNames.filter((name) => !(name in INTENTIONALLY_UNMAPPED));
    if (unexpected.length) {
      // New vendor names land here first. Map them (colorSwatches.ts) or list them above.
      console.warn(`Unmapped color names not in the intentional list: ${unexpected.join(", ")}`);
    }
    // Stale entries: a listed name that now maps (or left the catalog) must be removed.
    const catalog = catalogColorCounts();
    for (const name of Object.keys(INTENTIONALLY_UNMAPPED)) {
      if (!catalog.has(name)) continue;
      expect(swatchInfo(name).kind, `${name} is listed as unmapped but now maps`).toBe("unknown");
    }
  });

  it("every intentionally-unmapped entry gives a reason", () => {
    for (const [name, reason] of Object.entries(INTENTIONALLY_UNMAPPED)) {
      expect(reason.length, name).toBeGreaterThan(5);
    }
  });

  it("maps a real color for every name that has a product photo", () => {
    const photographed = new Set(
      (JSON.parse(readFileSync(fixturePath, "utf8")) as PhotoSample[]).map((s) => s.color)
    );
    for (const name of photographed) {
      expect(swatchInfo(name).kind, name).not.toBe("unknown");
    }
  });

  it("never returns a malformed hex", () => {
    for (const name of catalogColorCounts().keys()) {
      for (const color of swatchInfo(name).colors) {
        expect(color, name).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Visual evidence: swatches must not contradict the product photos.
// ---------------------------------------------------------------------------

interface PhotoSample {
  product: string;
  color: string;
  src: string;
  bg: number;
  clusters: { hex: string; frac: number }[];
}

const fixturePath = path.join(__dirname, "fixtures/colorPhotoSamples.json");

/** sRGB hex -> CIELAB (D65). */
function toLab(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 color difference: Euclidean distance in Lab (about 2.3 is a just-noticeable difference). */
function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * A swatch passes when at least one of its tones is within this distance of one
 * of the photo's dominant clusters. Photos include shading, models, trousers and
 * trim, so this catches wrong-hue mappings (red shown for blue), not shade choice.
 */
const MAX_PHOTO_DELTA_E = 30;

/** Photos whose shade genuinely differs from the generic name, with the reason. */
const PHOTO_EXCEPTIONS: Record<string, string> = {
  "devon-and-jones-mens-short-sleeve-polo-shirts-81136|Yellow":
    "vendor's pale butter yellow; the generic yellow is saturated",
  "devon-and-jones-mens-short-sleeve-polo-shirts-81136|Lime":
    "vendor's soft lime green; the generic lime is saturated",
  "insulated-travel-mug-16oz|Pink": "hot-pink band on a steel mug; generic pink is soft pink",
};

function photoDelta(sample: PhotoSample): number {
  const tones = swatchInfo(sample.color).colors;
  let best = Infinity;
  for (const tone of tones) {
    for (const cluster of sample.clusters) best = Math.min(best, deltaE(tone, cluster.hex));
  }
  return best;
}

describe("swatches agree with the per-color product photos", () => {
  const samples = JSON.parse(readFileSync(fixturePath, "utf8")) as PhotoSample[];
  const measurable = samples.filter((sample) => sample.clusters.length > 0);

  it("has a meaningful number of photo samples", () => {
    expect(measurable.length).toBeGreaterThan(200);
  });

  it("deltaE helper behaves", () => {
    expect(deltaE("#336699", "#336699")).toBe(0);
    expect(deltaE("#ff0000", "#0000ff")).toBeGreaterThan(80);
    expect(deltaE("#2a63c7", "#2a63c8")).toBeLessThan(1);
  });

  it(`no mapping is further than deltaE ${MAX_PHOTO_DELTA_E} from every dominant photo color`, () => {
    const failures = measurable
      .filter((sample) => !(`${sample.product}|${sample.color}` in PHOTO_EXCEPTIONS))
      .map((sample) => ({ sample, delta: photoDelta(sample) }))
      .filter(({ delta }) => delta > MAX_PHOTO_DELTA_E)
      .map(
        ({ sample, delta }) =>
          `${sample.product} / ${sample.color}: ${delta.toFixed(1)} ` +
          `(swatch ${swatchInfo(sample.color).colors.join(",")}, photo ${sample.clusters
            .map((c) => c.hex)
            .join(",")})`
      );
    expect(failures).toEqual([]);
  });

  it("every documented exception still needs its exemption", () => {
    for (const key of Object.keys(PHOTO_EXCEPTIONS)) {
      const [product, color] = key.split("|");
      const sample = measurable.find((s) => s.product === product && s.color === color);
      if (!sample) continue; // photo removed from the catalog
      expect(photoDelta(sample), key).toBeGreaterThan(MAX_PHOTO_DELTA_E);
    }
  });

  it("white and near-white items keep a light swatch", () => {
    for (const sample of measurable.filter((s) => /^(core )?white$/i.test(s.color))) {
      const [lightness] = toLab(swatchInfo(sample.color).colors[0]);
      expect(lightness, sample.product).toBeGreaterThan(85);
    }
  });
});
