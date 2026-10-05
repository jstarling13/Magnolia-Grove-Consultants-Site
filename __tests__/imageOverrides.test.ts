import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import imageOverrides from "@/config/imageOverrides.json";
import { allProducts } from "@/config/merchandiseConfig";

const entries = Object.entries(imageOverrides as Record<string, string>);

describe("imageOverrides.json", () => {
  it("only names products that exist", () => {
    const ids = new Set(allProducts.map((p) => p.id));
    expect(entries.filter(([id]) => !ids.has(id)).map(([id]) => id)).toEqual([]);
  });

  it("points every override at an existing image file under /images/merch/alt/", () => {
    const bad = entries.filter(
      ([, src]) =>
        !src.startsWith("/images/merch/alt/") ||
        !existsSync(path.join(process.cwd(), "public", src))
    );
    expect(bad).toEqual([]);
  });

  it("is applied to the product's main image", () => {
    for (const [id, src] of entries) {
      expect(allProducts.find((p) => p.id === id)?.image).toBe(src);
    }
  });
});
