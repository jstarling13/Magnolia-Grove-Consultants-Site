#!/usr/bin/env node
/**
 * Shrink the hand-sourced product photos in public/images/merch without visible
 * quality loss.
 *
 *   npm run images:optimize                 re-encode and replace eligible files
 *   npm run images:optimize -- --dry-run    report what would change, write nothing
 *   npm run images:optimize -- --verify     check the tree against the manifest (exit 1 on drift)
 *   Options: --root <dir> (repo root), --report <file> (write JSON report)
 *
 * Scope: files directly in public/images/merch larger than 90 KB, plus files in
 * public/images/merch/colors/ larger than 150 KB. Each is decoded with sharp,
 * resized to fit inside 1000x1000 (never enlarged, aspect ratio preserved) and
 * re-encoded in its REAL container format at the same path (webp q78 effort 5,
 * jpeg mozjpeg q80, png palette + compressionLevel 9). The result replaces the
 * original only if it is at least 25% smaller AND passes the similarity checks
 * in scripts/lib/imageOptimize.mjs.
 *
 * File names, extensions and paths never change. Note that many ".webp" files in
 * this folder are actually JPEG data; they stay JPEG (the container is detected
 * from the bytes, not the extension).
 *
 * scripts/data/image-optimize-manifest.json records, per processed file, the
 * original and optimized size/hash/dimensions. It makes re-runs idempotent (a
 * file that is already optimized, or was rejected, is never re-encoded) and lets
 * --verify prove nothing regressed. The manifest holds no timestamps, so the same
 * input always yields the same manifest.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  COLORS_MIN_BYTES,
  MAX_DIMENSION,
  MIN_BYTES,
  processImage,
  sameAspect,
  sha256,
} from "./lib/imageOptimize.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..");
const IMAGE_EXT = /\.(webp|jpe?g|png)$/i;
export const MANIFEST_REL = "scripts/data/image-optimize-manifest.json";
export const IMAGE_DIR_REL = "public/images/merch";

function parseArgs(argv) {
  const args = { root: DEFAULT_ROOT, dryRun: false, verify: false, report: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--verify") args.verify = true;
    else if (a === "--root") args.root = path.resolve(argv[++i]);
    else if (a === "--report") args.report = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

async function listFiles(dir, rel = "") {
  let names;
  try {
    names = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return names
    .filter((d) => d.isFile() && IMAGE_EXT.test(d.name))
    .map((d) => (rel ? `${rel}/${d.name}` : d.name));
}

/** Files in scope, as paths relative to public/images/merch (sorted). */
async function findCandidates(imgDir) {
  const top = await listFiles(imgDir);
  const colors = await listFiles(path.join(imgDir, "colors"), "colors");
  const out = [];
  for (const rel of [...top, ...colors]) {
    const { size } = await fs.stat(path.join(imgDir, rel));
    const min = rel.startsWith("colors/") ? COLORS_MIN_BYTES : MIN_BYTES;
    if (size > min) out.push({ rel, size });
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

async function readManifest(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

function emptyManifest() {
  return {
    version: 1,
    settings: {
      maxDimension: MAX_DIMENSION,
      minBytes: MIN_BYTES,
      colorsMinBytes: COLORS_MIN_BYTES,
      note: "sha256 and byte sizes are of the files at the time of the run; entries are keyed by path relative to public/images/merch",
    },
    files: {},
  };
}

async function runOptimize(args) {
  const imgDir = path.join(args.root, IMAGE_DIR_REL);
  const manifestPath = path.join(args.root, MANIFEST_REL);
  const manifest = (await readManifest(manifestPath)) ?? emptyManifest();
  const candidates = await findCandidates(imgDir);

  const rows = [];
  const counts = { optimized: 0, kept: 0, skipped: 0 };
  for (const { rel } of candidates) {
    const file = path.join(imgDir, rel);
    const buf = await fs.readFile(file);
    const digest = sha256(buf);
    const prev = manifest.files[rel];
    if (prev && prev.status === "optimized" && prev.optimized.sha256 === digest) {
      counts.skipped++;
      continue;
    }
    if (prev && prev.status === "kept" && prev.original.sha256 === digest) {
      counts.skipped++;
      continue;
    }
    const res = await processImage(buf);
    const { buffer, ...entry } = res;
    if (res.status === "optimized") {
      counts.optimized++;
      if (!args.dryRun) {
        const tmp = `${file}.tmp-optimize`;
        await fs.writeFile(tmp, buffer);
        await fs.rename(tmp, file);
      }
    } else {
      counts.kept++;
    }
    manifest.files[rel] = entry;
    rows.push({ rel, ...entry });
  }

  // Drop manifest entries for files that no longer exist.
  for (const rel of Object.keys(manifest.files)) {
    try {
      await fs.access(path.join(imgDir, rel));
    } catch {
      delete manifest.files[rel];
    }
  }
  manifest.files = Object.fromEntries(
    Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b))
  );

  if (!args.dryRun) {
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  printReport(rows, counts, candidates.length, args.dryRun);
  if (args.report) {
    await fs.writeFile(
      args.report,
      `${JSON.stringify({ dryRun: args.dryRun, counts, rows }, null, 2)}\n`
    );
  }
}

function printReport(rows, counts, total, dryRun) {
  const opt = rows.filter((r) => r.status === "optimized");
  const before = opt.reduce((s, r) => s + r.original.bytes, 0);
  const after = opt.reduce((s, r) => s + r.optimized.bytes, 0);
  console.log(
    `${dryRun ? "[dry run] " : ""}${total} candidate file(s): ` +
      `${counts.optimized} ${dryRun ? "would be " : ""}optimized, ${counts.kept} kept, ` +
      `${counts.skipped} already handled`
  );
  if (opt.length) {
    console.log(
      `Optimized files: ${mb(before)} -> ${mb(after)} (saved ${mb(before - after)}, ` +
        `${((1 - after / before) * 100).toFixed(1)}%)`
    );
    console.log("\nTop savings:");
    for (const r of [...opt]
      .sort((a, b) => b.original.bytes - b.optimized.bytes - (a.original.bytes - a.optimized.bytes))
      .slice(0, 10)) {
      console.log(
        `  ${r.rel}: ${kb(r.original.bytes)} -> ${kb(r.optimized.bytes)} ` +
          `(${r.original.width}x${r.original.height} -> ${r.optimized.width}x${r.optimized.height}, ` +
          `PSNR ${r.metrics.psnr.toFixed(1)} dB, MAD64 ${r.metrics.mad64.toFixed(2)})`
      );
    }
  }
  const kept = rows.filter((r) => r.status === "kept");
  if (kept.length) {
    console.log("\nKept (not replaced):");
    for (const r of kept) console.log(`  ${r.rel}: ${r.reason}`);
  }
}

async function runVerify(args) {
  const imgDir = path.join(args.root, IMAGE_DIR_REL);
  const manifest = await readManifest(path.join(args.root, MANIFEST_REL));
  if (!manifest) {
    console.error(`No manifest at ${MANIFEST_REL}; run npm run images:optimize first.`);
    process.exit(1);
  }
  const problems = [];
  let checked = 0;
  for (const [rel, e] of Object.entries(manifest.files)) {
    const file = path.join(imgDir, rel);
    let buf;
    try {
      buf = await fs.readFile(file);
    } catch {
      problems.push(`${rel}: file is missing`);
      continue;
    }
    checked++;
    const digest = sha256(buf);
    if (e.status === "kept") {
      if (digest !== e.original.sha256) problems.push(`${rel}: changed since it was recorded`);
      continue;
    }
    if (digest !== e.optimized.sha256) {
      problems.push(`${rel}: differs from the optimized file recorded in the manifest`);
      continue;
    }
    const m = await sharp(buf).metadata();
    if (m.format !== e.format) problems.push(`${rel}: format ${m.format}, expected ${e.format}`);
    if (Math.max(m.width, m.height) > MAX_DIMENSION) problems.push(`${rel}: larger than 1000px`);
    if (m.width > e.original.width || m.height > e.original.height)
      problems.push(`${rel}: upscaled`);
    if (!sameAspect(e.original.width, e.original.height, m.width, m.height)) {
      problems.push(
        `${rel}: aspect ratio changed (${e.original.width}x${e.original.height} -> ${m.width}x${m.height})`
      );
    }
    if (Boolean(m.hasAlpha) !== e.original.hasAlpha)
      problems.push(`${rel}: alpha presence changed`);
    if (buf.length > e.original.bytes) problems.push(`${rel}: larger than the original`);
  }
  // Large files that the manifest has never seen.
  for (const { rel, size } of await findCandidates(imgDir)) {
    if (!manifest.files[rel])
      problems.push(`${rel}: ${kb(size)} and not in the manifest (run npm run images:optimize)`);
  }
  if (problems.length) {
    console.error(`images:optimize --verify found ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`images:optimize --verify OK (${checked} manifest entries, no regressions)`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.verify) await runVerify(args);
  else await runOptimize(args);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
