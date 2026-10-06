import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import tailwindColors from "tailwindcss/colors";
import config from "../tailwind.config";

/**
 * WCAG AA for the admin orders workspace controls. Text needs 4.5:1; the
 * borders and focus rings that identify a control need 3:1 (WCAG 1.4.11).
 * Ratios come from the Tailwind palette, so changing a token fails here.
 */

type Rgb = [number, number, number];
const colors = config.theme!.extend!.colors as Record<string, Record<string, string>>;

const rgb = (hex: string): Rgb =>
  [0, 2, 4].map((i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16)) as Rgb;
const over = (fg: Rgb, alpha: number, bg: Rgb): Rgb =>
  fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as Rgb;
function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const white = rgb(colors.cream.DEFAULT);
const ink = rgb(colors.onyx.DEFAULT);
const cream = rgb(colors.cream.DEFAULT);
const surfaces: Record<string, Rgb> = {
  "page (cream)": white,
  "panel (cream-100)": rgb(colors.cream[100]),
  "hover (cream-200)": rgb(colors.cream[200]),
};

describe("admin orders workspace contrast", () => {
  it("secondary text (onyx/70 and onyx/80) clears 4.5:1 on every surface", () => {
    for (const [name, surface] of Object.entries(surfaces)) {
      for (const alpha of [0.7, 0.8]) {
        expect(
          contrast(over(ink, alpha, surface), surface),
          `${alpha} on ${name}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("section headings and links (gold-text) clear 4.5:1", () => {
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(contrast(rgb(colors.gold.text), surface), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("active chips and primary buttons: cream on onyx", () => {
    expect(contrast(cream, ink)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(cream, rgb(colors.onyx[100]))).toBeGreaterThanOrEqual(4.5);
  });

  it("error text (red-800) clears 4.5:1 on white and the flag background (red-50)", () => {
    const red = rgb((tailwindColors as unknown as Record<string, Record<string, string>>).red[800]);
    expect(contrast(red, white)).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(
        red,
        rgb((tailwindColors as unknown as Record<string, Record<string, string>>).red[50])
      )
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("control borders (onyx/50) and the focus ring (onyx) clear 3:1 against the page and panels", () => {
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(
        contrast(over(ink, 0.5, surface), surface),
        `border on ${name}`
      ).toBeGreaterThanOrEqual(3);
      expect(contrast(ink, surface), `ring on ${name}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("the old pale gold/25 control border did not reach 3:1, which is why it was replaced", () => {
    const pale = over(rgb(colors.gold.DEFAULT), 0.25, white);
    expect(contrast(pale, white)).toBeLessThan(3);
  });
});

describe("admin orders components use only the accessible shades", () => {
  const root = path.resolve(__dirname, "..", "src/components/admin/orders");
  const files = fs.readdirSync(root).filter((name) => name.endsWith(".tsx"));

  it("has components to check", () => expect(files.length).toBeGreaterThan(5));

  it.each(files)("%s has no gold-dark text and no focus rings in pale gold", (file) => {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    expect(source).not.toMatch(/text-gold-dark/);
    expect(source).not.toMatch(/focus:ring-gold|ring-gold\/60/);
  });

  it.each(["OrdersList.tsx", "EspReorderBlock.tsx", "OrderAuditTrail.tsx"])(
    "%s keeps readable text at onyx/60 or darker (disabled pager aside)",
    (file) => {
      const source = fs
        .readFileSync(path.join(root, file), "utf8")
        .replace(/border-gold\/10 px-3 py-1\.5 text-onyx\/30/g, "");
      expect(source).not.toMatch(/text-onyx\/(30|40|50)\b/);
    }
  );
});
