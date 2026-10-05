import { describe, expect, it } from "vitest";
import {
  cleanColorName,
  colorKey,
  swatchBackground,
  swatchColor,
  swatchInfo,
} from "@/lib/colorSwatches";

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
    ["Royal Blue", "#2a50a8"],
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

  it("stays unknown when any part is unrecognised, instead of showing half the name", () => {
    expect(swatchInfo("Black/Zorp")).toEqual({ kind: "unknown", colors: ["#e4e0d6"] });
    expect(swatchInfo("Red Flap/Blkred Blanket").kind).toBe("unknown");
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

describe("vendor color names", () => {
  it.each([
    ["Anthracite", "#43484d"],
    ["Cool Grey", "#81848a"],
    ["Storm", "#5d6d7e"],
    ["Iron", "#5a5d62"],
    ["Sapphire", "#1b66c7"],
    ["Chrome", "#d0d2d5"],
    ["Brass", "#b5a642"],
    ["Bamboo", "#d8c08c"],
    ["Clear", "#eef2f4"],
    ["Natural", "#ede6d6"],
    ["Gold", "#c8a951"],
    ["Silver", "#c7c9cc"],
  ])("%s resolves to %s", (name, hex) => {
    expect(swatchInfo(name)).toEqual({ kind: "solid", colors: [hex] });
  });

  it("prefers a specific hue over a bare base color", () => {
    expect(swatchColor("Mint Green")).toBe(swatchColor("Mint"));
    expect(swatchColor("Steel Blue")).not.toBe(swatchColor("Steel"));
    expect(swatchColor("Stone Blue")).not.toBe(swatchColor("Stone"));
  });

  it("reads translucent plastics as a lighter version of their color", () => {
    const lightness = (hex: string) =>
      [1, 3, 5].reduce((sum, i) => sum + Number.parseInt(hex.slice(i, i + 2), 16), 0);
    expect(lightness(swatchColor("Translucent Blue"))).toBeGreaterThan(
      lightness(swatchColor("Blue"))
    );
    expect(swatchColor("Clear Lid")).toBe(swatchColor("Clear"));
  });

  it("renders camouflage as a pattern of its typical tones", () => {
    expect(swatchInfo("Woodland Camouflage").kind).toBe("split");
    expect(swatchInfo("Desert Digital Camouflage").colors).not.toEqual(
      swatchInfo("Woodland Camouflage").colors
    );
    // A camo item in a named color keeps that color.
    expect(swatchInfo("Camouflage White")).toEqual(swatchInfo("White"));
  });

  it("treats 'several colors' labels as multi and a bare 'Custom' as unknown", () => {
    for (const name of ["Various", "Stock Colors", "Any/All Colors", "Custom (full-color print)"]) {
      expect(swatchInfo(name).kind, name).toBe("multi");
    }
    expect(swatchInfo("Custom").kind).toBe("unknown");
  });

  it("splits 'White Blue' style names into body + trim and keeps 'White White' solid", () => {
    expect(swatchInfo("White Blue").colors).toEqual([swatchColor("White"), swatchColor("Blue")]);
    expect(swatchInfo("White White").kind).toBe("solid");
    expect(swatchInfo("White Blend").kind).toBe("solid");
  });
});

describe("case, whitespace and vendor-code handling", () => {
  it.each([
    ["Navy-040", "Navy"],
    ["Navy 040", "Navy"],
    ["Navy - 040", "Navy"],
    ["Neon Yellow 364", "Neon Yellow"],
    ["Cottage Blue 293 C", "Cottage Blue"],
    ["Red 3", "Red"],
    ["Black (A)", "Black"],
    ["  royal   BLUE  ", "Royal Blue"],
  ])("%s resolves like %s", (name, plain) => {
    expect(swatchInfo(name)).toEqual(swatchInfo(plain));
  });

  it("keeps heather variants distinct from their base color", () => {
    expect(swatchColor("Black Heather - 104")).not.toBe(swatchColor("Black"));
    expect(swatchColor("Navy Heather - 240")).not.toBe(swatchColor("Navy"));
  });

  it("lets an exact vendor name with its code beat the keyword guess", () => {
    expect(swatchColor("Black Heather - 104")).toBe("#2e2f33");
    expect(swatchColor("Black Heather")).toBe("#7f7c7d");
  });

  it("colorKey drops case, punctuation, codes and variant letters", () => {
    expect(colorKey("  Black Heather - 104 ")).toBe("black heather");
    expect(colorKey("Navy-040")).toBe("navy");
    expect(colorKey("Navy (B)")).toBe("navy");
    expect(colorKey("Lt Blue")).toBe("light blue");
  });

  it("never changes the displayed name", () => {
    expect(cleanColorName("Navy Heather - 240")).toBe("Navy Heather - 240");
  });
});

describe("vendor two-tone codes", () => {
  it.each([
    ["Black/Ltoxf", 2],
    ["Royal_White", 2],
    ["Blue-Reflex-White", 2],
    ["Biscuit/True Blue", 2],
    ["Lime/Lt Blue", 2],
    ["Jet Gray-Black", 2],
    ["Heather-White", 2],
    ["Charcoal-Neon Green", 2],
  ])("%s becomes a %i-tone split", (name, tones) => {
    const info = swatchInfo(name);
    expect(info.kind).toBe("split");
    expect(info.colors).toHaveLength(tones);
  });

  it("reads 'Jersey-Black' as the color, not a two-tone", () => {
    expect(swatchInfo("Jersey-Black")).toEqual(swatchInfo("Black"));
  });
});

describe("second-pass catalog names (bags, drinkware, event, outdoor)", () => {
  it.each([
    ["Eggplant", "#614051"],
    ["Cerulean", "#2a7fba"],
    ["Marigold", "#eaa221"],
    ["Cambridge Blue", "#a3c1ad"],
    ["Cool Grey 6", "#a7a8aa"],
    ["Cool Grey 8", "#888b8d"],
    ["Warm Grey 1", "#d7d2cb"],
  ])("%s resolves to %s", (name, hex) => {
    expect(swatchInfo(name)).toEqual({ kind: "solid", colors: [hex] });
  });

  it("keeps Pantone numbers that change the shade apart", () => {
    expect(swatchColor("Cool Grey 6")).not.toBe(swatchColor("Cool Grey 8"));
  });

  it("treats print-option labels as multi and sport names as unknown", () => {
    for (const name of ["CMYK", "All Colors", "PMS Color Match", "Fullcolor Avail"]) {
      expect(swatchInfo(name).kind, name).toBe("multi");
    }
    expect(swatchInfo("Soccer").kind).toBe("unknown");
  });

  it("draws 'Camo1' as camouflage", () => {
    expect(swatchInfo("Camo1")).toEqual(swatchInfo("Camouflage"));
  });
});
