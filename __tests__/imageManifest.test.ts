// @vitest-environment node
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { MAX_DIMENSION, sameAspect, sha256 } from "../scripts/lib/imageOptimize.mjs";

const ROOT = path.resolve(__dirname, "..");
const IMG_DIR = path.join(ROOT, "public/images/merch");
const MANIFEST = path.join(ROOT, "scripts/data/image-optimize-manifest.json");

interface Entry {
  format: string;
  status: "optimized" | "kept";
  original: { bytes: number; sha256: string; width: number; height: number; hasAlpha: boolean };
  optimized?: { bytes: number; sha256: string; width: number; height: number };
}

async function loadManifest(): Promise<Record<string, Entry>> {
  return JSON.parse(await fs.readFile(MANIFEST, "utf8")).files;
}

// The logo overlay in ProductImageWithLogo derives its geometry from the image's
// natural aspect ratio, so the optimizer must never change it.
describe("optimized merch photos (scripts/data/image-optimize-manifest.json)", () => {
  it("lists a meaningful number of optimized files", async () => {
    const entries = Object.values(await loadManifest());
    expect(entries.filter((e) => e.status === "optimized").length).toBeGreaterThan(50);
  });

  it("keeps every processed file's aspect ratio (within 1 px), format and bounds", async () => {
    const files = await loadManifest();
    for (const [rel, e] of Object.entries(files)) {
      const buf = await fs.readFile(path.join(IMG_DIR, rel));
      const meta = await sharp(buf).metadata();
      expect(meta.format, rel).toBe(e.format);
      expect(Boolean(meta.hasAlpha), rel).toBe(e.original.hasAlpha);
      if (e.status === "kept") {
        expect(sha256(buf), rel).toBe(e.original.sha256);
        continue;
      }
      expect(sha256(buf), rel).toBe(e.optimized!.sha256);
      expect([meta.width, meta.height], rel).toEqual([e.optimized!.width, e.optimized!.height]);
      expect(sameAspect(e.original.width, e.original.height, meta.width!, meta.height!), rel).toBe(
        true
      );
      expect(Math.max(meta.width!, meta.height!), rel).toBeLessThanOrEqual(MAX_DIMENSION);
      expect(meta.width!, rel).toBeLessThanOrEqual(e.original.width);
      expect(meta.height!, rel).toBeLessThanOrEqual(e.original.height);
      expect(buf.length, rel).toBeLessThanOrEqual(e.original.bytes * 0.75);
    }
  }, 60_000);
});
