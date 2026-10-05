// @vitest-environment node
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  MAX_DIMENSION,
  processImage,
  sameAspect,
  sha256,
  similarity,
  targetSize,
} from "../scripts/lib/imageOptimize.mjs";

const SCRIPT = path.resolve(__dirname, "../scripts/optimizeImages.mjs");

/** Deterministic photo-like test image: gradients plus light noise. */
function synth(width: number, height: number, channels: 3 | 4 = 3) {
  const data = Buffer.alloc(width * height * channels);
  let seed = 7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const n = (rand() - 0.5) * 10;
      data[i] = clamp((x / width) * 200 + n);
      data[i + 1] = clamp((y / height) * 200 + n);
      data[i + 2] = clamp(128 + 60 * Math.sin(x / 37) + n);
      if (channels === 4) {
        const dx = x - width / 2;
        const dy = y - height / 2;
        data[i + 3] = dx * dx + dy * dy < (Math.min(width, height) / 2.2) ** 2 ? 255 : 0;
      }
    }
  }
  return sharp(data, { raw: { width, height, channels } });
}

describe("targetSize / sameAspect", () => {
  it("fits inside 1000x1000 and never enlarges", () => {
    expect(targetSize(1200, 1200)).toEqual({ width: 1000, height: 1000 });
    expect(targetSize(1200, 800)).toEqual({ width: 1000, height: 667 });
    expect(targetSize(800, 1200)).toEqual({ width: 667, height: 1000 });
    expect(targetSize(900, 600)).toEqual({ width: 900, height: 600 });
    expect(targetSize(5000, 100)).toEqual({ width: MAX_DIMENSION, height: 20 });
    expect(targetSize(3, 3000)).toEqual({ width: 1, height: 1000 });
  });

  it("allows 1 px of rounding and nothing more", () => {
    expect(sameAspect(1200, 800, 1000, 667)).toBe(true);
    expect(sameAspect(1200, 800, 1000, 666)).toBe(true);
    expect(sameAspect(1200, 800, 1000, 700)).toBe(false);
    expect(sameAspect(1200, 1200, 1000, 998)).toBe(false);
  });
});

describe("processImage", () => {
  it("shrinks a large jpeg, keeps the container and the aspect ratio", async () => {
    const input = await synth(1200, 800).jpeg({ quality: 97 }).toBuffer();
    const res = await processImage(input);
    expect(res.status).toBe("optimized");
    expect(res.format).toBe("jpeg");
    const meta = await sharp(res.buffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect([meta.width, meta.height]).toEqual([1000, 667]);
    expect(res.buffer!.length).toBeLessThan(input.length * 0.75);
    expect(res.metrics!.psnr).toBeGreaterThan(34);
  });

  it("never upscales a small image", async () => {
    const input = await synth(600, 400).jpeg({ quality: 100 }).toBuffer();
    const res = await processImage(input);
    expect(res.status).toBe("optimized");
    const meta = await sharp(res.buffer).metadata();
    expect([meta.width, meta.height]).toEqual([600, 400]);
  });

  it("preserves transparency in webp", async () => {
    const input = await synth(1200, 1000, 4).webp({ quality: 100 }).toBuffer();
    const res = await processImage(input);
    expect(res.status).toBe("optimized");
    expect(res.original.hasAlpha).toBe(true);
    const meta = await sharp(res.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.hasAlpha).toBe(true);
    expect([meta.width, meta.height]).toEqual([1000, 833]);
    // The corner is transparent, the centre is opaque.
    const { data, info } = await sharp(res.buffer).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    expect(data[3]).toBe(0);
    expect(data[((info.height >> 1) * info.width + (info.width >> 1)) * 4 + 3]).toBe(255);
  });

  it("keeps the original when a lossy re-encode would be visibly worse", async () => {
    // Noisy png: palette quantization is far from visually identical.
    const input = await synth(1200, 800).png().toBuffer();
    const res = await processImage(input);
    expect(res.status).toBe("kept");
    expect(res.reason).toMatch(/failed safety check|smaller/);
    expect(res.buffer).toBeUndefined();
  });

  it("keeps the original when it is already small", async () => {
    const input = await synth(300, 300).webp({ quality: 40 }).toBuffer();
    const res = await processImage(input);
    expect(res.status).toBe("kept");
    expect(res.reason).toMatch(/smaller/);
  });
});

describe("similarity", () => {
  it("accepts a faithful re-encode", async () => {
    const original = await synth(800, 800).jpeg({ quality: 97 }).toBuffer();
    const candidate = await sharp(original).jpeg({ quality: 80 }).toBuffer();
    const res = await similarity(original, candidate, { width: 800, height: 800, hasAlpha: false });
    expect(res.ok).toBe(true);
  });

  it("rejects different content, a changed aspect ratio and lost alpha", async () => {
    const original = await synth(800, 800).jpeg({ quality: 97 }).toBuffer();
    const info = { width: 800, height: 800, hasAlpha: false };
    const inverted = await sharp(original).negate().jpeg().toBuffer();
    expect((await similarity(original, inverted, info)).ok).toBe(false);

    const squashed = await sharp(original).resize(800, 700, { fit: "fill" }).jpeg().toBuffer();
    const aspect = await similarity(original, squashed, info);
    expect(aspect.ok).toBe(false);
    expect(aspect.failures.join()).toMatch(/aspect/);

    const withAlpha = await synth(400, 400, 4).png().toBuffer();
    const flat = await sharp(withAlpha).flatten({ background: "#fff" }).png().toBuffer();
    const alpha = await similarity(withAlpha, flat, { width: 400, height: 400, hasAlpha: true });
    expect(alpha.ok).toBe(false);
    expect(alpha.failures.join()).toMatch(/alpha/);
  });
});

describe("optimizeImages CLI", () => {
  let root: string;
  let imgDir: string;
  const manifestPath = () => path.join(root, "scripts/data/image-optimize-manifest.json");
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], { encoding: "utf8" });

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "optimize-images-"));
    imgDir = path.join(root, "public/images/merch");
    await fs.mkdir(path.join(imgDir, "colors"), { recursive: true });
    const big = await synth(1200, 900).jpeg({ quality: 97 }).toBuffer();
    await fs.writeFile(path.join(imgDir, "big.jpg"), big);
    // A JPEG stored under a .webp name stays JPEG (container is read from the bytes).
    await fs.writeFile(path.join(imgDir, "mislabeled.webp"), big);
    await fs.writeFile(path.join(imgDir, "small.jpg"), await synth(100, 100).jpeg().toBuffer());
    // colors/ files are only considered above 150 KB.
    await fs.writeFile(
      path.join(imgDir, "colors", "mid.jpg"),
      await synth(500, 500).jpeg({ quality: 97 }).toBuffer()
    );
  });

  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("--dry-run reports but writes nothing", async () => {
    const before = sha256(await fs.readFile(path.join(imgDir, "big.jpg")));
    const res = run("--dry-run");
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/2 would be optimized/);
    expect(sha256(await fs.readFile(path.join(imgDir, "big.jpg")))).toBe(before);
    await expect(fs.access(manifestPath())).rejects.toThrow();
  });

  it("optimizes in place, never touches small or colors/ files, and keeps names", async () => {
    const smallBefore = await fs.readFile(path.join(imgDir, "small.jpg"));
    const midBefore = await fs.readFile(path.join(imgDir, "colors", "mid.jpg"));
    const res = run();
    expect(res.status).toBe(0);

    for (const name of ["big.jpg", "mislabeled.webp"]) {
      const meta = await sharp(path.join(imgDir, name)).metadata();
      expect(meta.format).toBe("jpeg");
      expect([meta.width, meta.height]).toEqual([1000, 750]);
    }
    expect(await fs.readFile(path.join(imgDir, "small.jpg"))).toEqual(smallBefore);
    expect(await fs.readFile(path.join(imgDir, "colors", "mid.jpg"))).toEqual(midBefore);
    expect((await fs.readdir(imgDir)).sort()).toEqual([
      "big.jpg",
      "colors",
      "mislabeled.webp",
      "small.jpg",
    ]);

    const manifest = JSON.parse(await fs.readFile(manifestPath(), "utf8"));
    expect(Object.keys(manifest.files)).toEqual(["big.jpg", "mislabeled.webp"]);
    expect(manifest.files["big.jpg"].original.width).toBe(1200);
    expect(manifest.files["big.jpg"].optimized.width).toBe(1000);
  });

  it("is idempotent: a second run changes nothing", async () => {
    const files = ["big.jpg", "mislabeled.webp"];
    const before = await Promise.all(files.map((f) => fs.readFile(path.join(imgDir, f))));
    const manifestBefore = await fs.readFile(manifestPath(), "utf8");
    const res = run();
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/0 optimized/);
    const after = await Promise.all(files.map((f) => fs.readFile(path.join(imgDir, f))));
    expect(after).toEqual(before);
    expect(await fs.readFile(manifestPath(), "utf8")).toBe(manifestBefore);
  });

  it("--verify passes, then fails when a file drifts or a large file is unrecorded", async () => {
    expect(run("--verify").status).toBe(0);

    const target = path.join(imgDir, "big.jpg");
    const good = await fs.readFile(target);
    await fs.writeFile(
      target,
      await sharp(good).resize(1000, 700, { fit: "fill" }).jpeg().toBuffer()
    );
    const drift = run("--verify");
    expect(drift.status).toBe(1);
    expect(drift.stderr).toMatch(/big\.jpg/);
    await fs.writeFile(target, good);
    expect(run("--verify").status).toBe(0);

    await fs.writeFile(
      path.join(imgDir, "new-big.jpg"),
      await synth(1200, 1200).jpeg({ quality: 97 }).toBuffer()
    );
    const unrecorded = run("--verify");
    expect(unrecorded.status).toBe(1);
    expect(unrecorded.stderr).toMatch(/new-big\.jpg.*not in the manifest/);
    await fs.rm(path.join(imgDir, "new-big.jpg"));
  });

  it("rejects unknown arguments", () => {
    const res = spawnSync(process.execPath, [SCRIPT, "--nope"], { encoding: "utf8" });
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/Unknown argument/);
  });
});
