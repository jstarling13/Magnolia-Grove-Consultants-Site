#!/usr/bin/env node
/**
 * Swatch-color tooling.
 *
 *   node scripts/colorCoverage.mjs --sample
 *       Samples the dominant item colors of every per-color product photo
 *       (src/config/colorImages*.json -> /public) and writes the observations to
 *       __tests__/fixtures/colorPhotoSamples.json. That fixture is the visual
 *       evidence the swatch tests validate src/lib/colorSwatches.ts against.
 *
 *   node scripts/colorCoverage.mjs --report
 *       Runs the live-catalog coverage report (how many color names/occurrences
 *       fall back to the neutral dashed swatch, plus the unmapped list). It runs
 *       through vitest because the catalog is TypeScript.
 *
 * Sampling: each photo is shrunk to 96px, near-white studio background pixels are
 * discarded, and the rest are clustered with a small deterministic k-means. The
 * three biggest clusters (hex + share of the non-background pixels) are kept.
 * Models and trousers can show up as secondary clusters, which is why the tests
 * compare a swatch against the top clusters rather than only the first one.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_FILES = ["colorImages.json", "colorImages.extra1.json", "colorImages.extra2.json"];
const OUT = path.join(root, "__tests__/fixtures/colorPhotoSamples.json");
const SIZE = 96;
const BG_MIN_CHANNEL = 236;
const K = 5;
const KEEP = 4;

const hex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function kmeans(pixels) {
  // Deterministic init: spread seeds along luminance order.
  const order = pixels
    .map((p, i) => [p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11, i])
    .sort((a, b) => a[0] - b[0]);
  let centers = Array.from({ length: K }, (_, k) => [
    ...pixels[order[Math.floor(((k + 0.5) / K) * (order.length - 1))][1]],
  ]);
  let assign = new Array(pixels.length).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    pixels.forEach((p, i) => {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, k) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      });
      assign[i] = best;
      sums[best][0] += p[0];
      sums[best][1] += p[1];
      sums[best][2] += p[2];
      sums[best][3] += 1;
    });
    centers = centers.map((c, k) =>
      sums[k][3] ? [sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]] : c
    );
  }
  const counts = new Array(K).fill(0);
  assign.forEach((k) => counts[k]++);
  return centers
    .map((c, k) => ({ hex: hex(c), frac: counts[k] / pixels.length }))
    .sort((a, b) => b.frac - a.frac);
}

async function sampleFile(file) {
  const { data, info } = await sharp(file)
    .resize(SIZE, SIZE, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = [];
  const total = info.width * info.height;
  for (let i = 0; i < total; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    if (Math.min(r, g, b) >= BG_MIN_CHANNEL) continue;
    pixels.push([r, g, b]);
  }
  const bg = 1 - pixels.length / total;
  if (pixels.length < 40) return { bg: +bg.toFixed(3), clusters: [] };
  const clusters = kmeans(pixels)
    .slice(0, KEEP)
    .map((c) => ({ hex: c.hex, frac: +c.frac.toFixed(3) }));
  return { bg: +bg.toFixed(3), clusters };
}

async function sample() {
  const merged = {};
  for (const name of MAP_FILES) {
    const file = path.join(root, "src/config", name);
    if (!fs.existsSync(file)) continue;
    for (const [id, colors] of Object.entries(JSON.parse(fs.readFileSync(file, "utf8")))) {
      merged[id] = { ...merged[id], ...colors };
    }
  }
  const rows = [];
  for (const [product, colors] of Object.entries(merged).sort(([a], [b]) => a.localeCompare(b))) {
    for (const [color, src] of Object.entries(colors).sort(([a], [b]) => a.localeCompare(b))) {
      const file = path.join(root, "public", src.replace(/^\//, ""));
      if (!fs.existsSync(file)) continue;
      try {
        rows.push({ product, color, src, ...(await sampleFile(file)) });
      } catch (error) {
        console.warn(`skip ${src}: ${error.message}`);
      }
    }
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const lines = rows.map((row) => "  " + JSON.stringify(row));
  fs.writeFileSync(OUT, "[\n" + lines.join(",\n") + "\n]\n");
  console.log(`wrote ${rows.length} photo samples to ${path.relative(root, OUT)}`);
}

function report() {
  const result = spawnSync(
    "npx",
    ["vitest", "run", "__tests__/colorSwatches.coverage.test.ts", "--reporter=dot"],
    { cwd: root, stdio: "inherit", env: { ...process.env, COLOR_COVERAGE_REPORT: "1" } }
  );
  process.exit(result.status ?? 1);
}

const args = process.argv.slice(2);
if (args.includes("--sample")) await sample();
else if (args.includes("--report")) report();
else {
  console.log("Usage: node scripts/colorCoverage.mjs --sample | --report");
  process.exit(2);
}
