import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import config from "../tailwind.config";

/**
 * WCAG AA contrast for the small text on the product page. Ratios are computed
 * from the Tailwind palette itself, so changing a token that these classes rely
 * on fails here instead of quietly dropping below 4.5:1.
 */

type Rgb = [number, number, number];

const colors = config.theme!.extend!.colors as Record<string, Record<string, string>>;

function rgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as Rgb;
}

/** `foreground` at `alpha` opacity over an opaque `background`. */
function over(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  return foreground.map((c, i) => c * alpha + background[i] * (1 - alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;
const white = rgb(colors.cream.DEFAULT);
/**
 * Every light surface small text sits on: the page, the cream tiers, and the
 * translucent panels/cards (bg-cream-100/60, /85) composited on the page.
 */
const surfaces: Record<string, Rgb> = {
  "cream (page)": white,
  "cream-100": rgb(colors.cream[100]),
  "cream-200": rgb(colors.cream[200]),
  "cream-100/85 card": over(rgb(colors.cream[100]), 0.85, white),
  "cream-100/60 panel": over(rgb(colors.cream[100]), 0.6, white),
};
const ink = rgb(colors.onyx.DEFAULT);

describe("small-text contrast tokens", () => {
  it("text-onyx/60 (labels, disclaimers) clears 4.5:1 on every light surface", () => {
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(contrast(over(ink, 0.6, surface), surface), name).toBeGreaterThanOrEqual(AA);
    }
  });

  it("documents why /50 and below were replaced: they fall under 4.5:1", () => {
    for (const alpha of [0.5, 0.45]) {
      expect(contrast(over(ink, alpha, white), white)).toBeLessThan(AA);
    }
  });

  it("gold.text (eyebrows, text links) clears 4.5:1 on every light surface", () => {
    const gold = rgb(colors.gold.text);
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(contrast(gold, surface), name).toBeGreaterThanOrEqual(AA);
    }
  });

  it("gold.dark was too light for small text, which is why gold.text exists", () => {
    expect(contrast(rgb(colors.gold.dark), white)).toBeLessThan(AA);
    expect(contrast(rgb(colors.gold.dark), rgb(colors.cream[100]))).toBeLessThan(AA);
  });

  it("gold.text stays a gold: same hue family as gold.dark, only darker", () => {
    const hue = ([r, g, b]: Rgb) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return ((60 * (g - b)) / (max - min) + 360) % 360;
    };
    expect(Math.abs(hue(rgb(colors.gold.text)) - hue(rgb(colors.gold.dark)))).toBeLessThan(8);
    expect(luminance(rgb(colors.gold.text))).toBeLessThan(luminance(rgb(colors.gold.dark)));
  });

  it("breadcrumb separators (text-muted/70) clear 4.5:1 on the onyx band", () => {
    const band = rgb(colors.onyx.DEFAULT);
    expect(contrast(over(rgb(colors.muted.DEFAULT), 0.7, band), band)).toBeGreaterThanOrEqual(AA);
    // The old /50 separator was 3.66:1.
    expect(contrast(over(rgb(colors.muted.DEFAULT), 0.5, band), band)).toBeLessThan(AA);
  });
});

describe("product page sources use only the accessible shades", () => {
  const root = path.resolve(__dirname, "..");
  const files = [
    "src/app/(marketing)/merchandise/[id]/page.tsx",
    "src/components/merchandise/ProductGallery.tsx",
    "src/components/merchandise/ColorSwatches.tsx",
    "src/components/merchandise/LogoDropzone.tsx",
    "src/components/merchandise/RecentlyViewed.tsx",
    "src/components/merchandise/ProductDetailActions.tsx",
    "src/components/merchandise/ProductCard.tsx",
    "src/components/merchandise/ProductCatalog.tsx",
    "src/components/merchandise/CategoryProductGrid.tsx",
  ];

  for (const file of files) {
    it(`${path.basename(file)} has no text-onyx below /60, text-gold-dark or text-muted below /70`, () => {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      // Variants (hover:, focus:) are matched too; only a word/hyphen prefix is excluded.
      expect(source.match(/text-onyx\/(?:[1-5]\d|[1-9])(?!\d)/g)).toBeNull();
      expect(source.match(/(?<![-\w])(?:[a-z-]+:)*text-gold-dark(?![-\w])/g)).toBeNull();
      expect(source.match(/text-muted\/(?:[1-6]\d|[1-9])(?!\d)/g)).toBeNull();
    });
  }
});
