import { describe, expect, it } from "vitest";
import { cleanColorName, swatchBackground, swatchColor, swatchInfo } from "@/lib/colorSwatches";

describe("cleanColorName", () => {
  it("strips the supplier 'Show less' / 'Show more' suffix defensively", () => {
    expect(cleanColorName("Navy Blue Show less")).toBe("Navy Blue");
    expect(cleanColorName("Heather Gray show more")).toBe("Heather Gray");
    expect(cleanColorName("Black   SHOW LESS ")).toBe("Black");
  });

  it("collapses whitespace and leaves ordinary names alone", () => {
    expect(cleanColorName("  Forest   Green ")).toBe("Forest Green");
    expect(cleanColorName("Showtime Red")).toBe("Showtime Red");
  });
});

describe("swatchInfo: common ESP color names", () => {
  it.each([
    ["Navy Blue", "#1b2a4a"],
    ["Royal Blue", "#2748c0"],
    ["Forest Green", "#284b33"],
    ["Hunter Green", "#2e4d3a"],
    ["Carolina Blue", "#7bafd4"],
    ["Cardinal", "#a6192e"],
    ["Burgundy", "#6d0e23"],
    ["Maroon", "#6f2c3f"],
    ["Heather Gray", "#9a9a9a"],
    ["Charcoal", "#3b3b3b"],
    ["Natural", "#ede6d6"],
    ["Khaki", "#c3b091"],
    ["Tan", "#d2b48c"],
    ["Orange", "#e8732c"],
    ["Gold", "#c8a951"],
    ["Teal", "#1f7a7a"],
    ["Lime", "#8fbf3f"],
    ["Neon Green", "#39e639"],
    ["Neon Yellow", "#e8f50a"],
    ["Neon Orange", "#ff6a13"],
  ])("%s resolves to %s", (name, hex) => {
    expect(swatchInfo(name)).toEqual({ kind: "solid", colors: [hex] });
  });

  it("ignores casing", () => {
    expect(swatchInfo("NAVY BLUE")).toEqual(swatchInfo("navy blue"));
    expect(swatchInfo("hEaThEr GrAy")).toEqual(swatchInfo("Heather Gray"));
  });

  it("ignores the 'Show less' suffix", () => {
    expect(swatchInfo("Navy Blue Show less")).toEqual(swatchInfo("Navy Blue"));
    expect(swatchColor("Cardinal show more")).toBe("#a6192e");
  });

  it("prefers the most specific phrase over a shorter one", () => {
    expect(swatchColor("Light Blue")).toBe("#a9c9e6");
    expect(swatchColor("Navy Blue")).not.toBe(swatchColor("Blue"));
  });

  it("only matches whole words", () => {
    // 'tan' inside 'Titanium' and 'mint' inside 'Peppermint' are not colors.
    expect(swatchColor("Titanium")).toBe("#8a8d8f");
    expect(swatchInfo("Peppermint").kind).toBe("unknown");
    expect(swatchInfo("Stan").kind).toBe("unknown");
  });

  it("derives dark and light variants from the base color", () => {
    const brightness = (hex: string) =>
      [1, 3, 5].reduce((sum, i) => sum + Number.parseInt(hex.slice(i, i + 2), 16), 0);
    expect(brightness(swatchColor("Dark Green"))).toBeLessThan(brightness(swatchColor("Green")));
    expect(brightness(swatchColor("Light Gray"))).toBeGreaterThan(brightness(swatchColor("Gray")));
  });

  it("keeps the real hue for 'Heathered' compound names", () => {
    const hex = swatchColor("Heathered Vista Blue");
    const [r, , b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r);
  });

  it("reads Pantone-style names by their color word", () => {
    expect(swatchColor("Cottage Blue 293 C")).toBe(swatchColor("Blue"));
  });
});

describe("swatchInfo: two-tone names", () => {
  it.each(["Black/Gray", "Black-Gray", "Black_Gray", "Black / Gray", "BLACK/GRAY"])(
    "%s becomes a two-color split",
    (name) => {
      expect(swatchInfo(name)).toEqual({ kind: "split", colors: ["#111111", "#8b8b8b"] });
    }
  );

  it("handles Azure_White and Red/White", () => {
    expect(swatchInfo("Azure_White")).toEqual({ kind: "split", colors: ["#1f8ceb", "#fafafa"] });
    expect(swatchInfo("Red/White")).toEqual({ kind: "split", colors: ["#c8102e", "#fafafa"] });
  });

  it("supports three tones and caps at three", () => {
    expect(swatchInfo("Navy Blue/White/Gold").colors).toHaveLength(3);
    expect(swatchInfo("Red/White/Blue/Black").colors).toHaveLength(3);
  });

  it("does not split a single hyphenated color", () => {
    expect(swatchInfo("Navy-Blue")).toEqual({ kind: "solid", colors: ["#1b2a4a"] });
    expect(swatchInfo("Heather-Gray")).toEqual({ kind: "solid", colors: ["#9a9a9a"] });
  });

  it("falls back to the one known part when the other is unrecognised", () => {
    expect(swatchInfo("Black/Zorp")).toEqual({ kind: "solid", colors: ["#111111"] });
  });

  it("renders splits as a hard-stop diagonal gradient", () => {
    const css = swatchBackground(swatchInfo("Black/Gray"));
    expect(css).toMatch(/^linear-gradient\(135deg,/);
    expect(css).toContain("#111111 0.00% 50.00%");
    expect(css).toContain("#8b8b8b 50.00% 100.00%");
  });
});

describe("swatchInfo: multi and unknown", () => {
  it("treats assorted/multi names as a multi-color swatch", () => {
    expect(swatchInfo("Assorted").kind).toBe("multi");
    expect(swatchBackground(swatchInfo("Multi Color"))).toMatch(/^conic-gradient\(/);
  });

  it("gives unrecognised names a neutral fallback flagged unknown", () => {
    expect(swatchInfo("Mystery Tint 9921")).toEqual({ kind: "unknown", colors: ["#e4e0d6"] });
    expect(swatchBackground(swatchInfo(""))).toBe("#e4e0d6");
  });
});
