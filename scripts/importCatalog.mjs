#!/usr/bin/env node
/**
 * Bulk catalog import: raw ESP+ scrape batches -> clean catalog data + images.
 *
 *   npm run catalog:import
 *   npm run catalog:import -- --raw <dir> [--no-images] [--dry-run] [--report <file>] [--root <dir>]
 *
 * Regenerates, wholesale and deterministically, from ALL raw/*.json files:
 *   src/config/importedProducts.json   browser-safe catalog records (raw ESP catalog prices)
 *   src/lib/espLinks.imported.json     server-only { id: { espId, supplier, asi, productNo } }
 *   public/images/merch/<id>.webp      compressed product images (skipped if already present)
 *
 * Re-running is idempotent: existing images are never re-downloaded, and with
 * unchanged raw input the JSON files are byte-identical.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import { buildCatalog, toPublicRecord } from "./lib/catalogClean.mjs";
import { DOWNLOAD_CONCURRENCY, ensureImage, mapConcurrent } from "./lib/catalogImages.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_RAW_DIR =
  "/private/tmp/claude-501/-Users-jacob-Library-Mobile-Documents-com-apple-CloudDocs-Magnolia-Grove-Consultants-Ben-Website/a8f0d662-f8a3-42ef-a321-b07396577760/scratchpad/bulk/raw";

function parseArgs(argv) {
  const args = {
    raw: process.env.CATALOG_RAW_DIR || DEFAULT_RAW_DIR,
    root: REPO_ROOT,
    images: true,
    dryRun: false,
    report: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--raw") args.raw = argv[++i];
    else if (a === "--root") args.root = path.resolve(argv[++i]);
    else if (a === "--no-images") args.images = false;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--report") args.report = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

/** ids + names of the hand-curated products, read from merchandiseConfig.ts. */
export function readCuratedProducts(source) {
  const start = source.indexOf("const curatedProducts");
  const end = source.indexOf("// Per-color photos");
  if (start < 0 || end < 0)
    throw new Error("Could not locate curatedProducts in merchandiseConfig.ts");
  const block = source.slice(start, end);
  const ids = [...block.matchAll(/^ {4}id:\s*"([^"]+)"/gm)].map((m) => m[1]);
  const names = [...block.matchAll(/^ {4}name:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/gm)].map(
    (m) => {
      const lit = m[1];
      return lit[0] === '"' ? JSON.parse(lit) : lit.slice(1, -1).replace(/\\(.)/g, "$1");
    }
  );
  if (ids.length === 0 || ids.length !== names.length) {
    throw new Error(`Curated parse mismatch: ${ids.length} ids vs ${names.length} names`);
  }
  return { ids, names };
}

async function readRawRows(rawDir) {
  const entries = (await fs.readdir(rawDir)).filter((f) => f.endsWith(".json")).sort();
  const rows = [];
  const files = [];
  const badFiles = [];
  for (const file of entries) {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(rawDir, file), "utf8"));
      if (!Array.isArray(parsed)) throw new Error("not a JSON array");
      rows.push(...parsed);
      files.push({ file, rows: parsed.length });
    } catch (err) {
      badFiles.push({ file, error: err.message });
    }
  }
  const done = (await fs.readdir(rawDir)).includes("DONE");
  return { rows, files, badFiles, done };
}

async function formatJson(root, text) {
  const config = (await prettier.resolveConfig(path.join(root, "x.json"))) ?? {};
  return prettier.format(text, { ...config, plugins: [], parser: "json" });
}

async function writeIfChanged(file, content) {
  try {
    if ((await fs.readFile(file, "utf8")) === content) return false;
  } catch {
    // new file
  }
  await fs.writeFile(file, content);
  return true;
}

export async function runImport(args) {
  const root = args.root;
  const imagesDir = path.join(root, "public/images/merch");
  const productsFile = path.join(root, "src/config/importedProducts.json");
  const linksFile = path.join(root, "src/lib/espLinks.imported.json");

  const curated = readCuratedProducts(
    await fs.readFile(path.join(REPO_ROOT, "src/config/merchandiseConfig.ts"), "utf8")
  );
  const { rows, files, badFiles, done } = await readRawRows(args.raw);
  const { items, skipped, skippedDetail } = buildCatalog(rows, {
    curatedNames: curated.names,
    curatedIds: curated.ids,
  });

  // Images: keep a product only if its image exists / downloads.
  let imageBytes = 0;
  let downloaded = 0;
  let reused = 0;
  let kept = items;
  if (args.images) {
    await fs.mkdir(imagesDir, { recursive: true });
    const results = await mapConcurrent(items, DOWNLOAD_CONCURRENCY, (item) =>
      ensureImage(item, imagesDir)
    );
    kept = [];
    results.forEach((result, i) => {
      if (result.status === "failed") {
        skipped["image-failed"] = (skipped["image-failed"] ?? 0) + 1;
        skippedDetail.push({
          reason: "image-failed",
          espId: items[i].link.espId,
          name: items[i].product.name,
          error: result.error,
        });
        return;
      }
      if (result.status === "downloaded") downloaded++;
      else reused++;
      imageBytes += result.bytes;
      kept.push(items[i]);
    });
  }

  const publicRecords = kept.map(toPublicRecord);
  const links = Object.fromEntries(kept.map((item) => [item.id, item.link]));

  if (!args.dryRun) {
    await writeIfChanged(productsFile, await formatJson(root, JSON.stringify(publicRecords)));
    await writeIfChanged(linksFile, await formatJson(root, JSON.stringify(links)));
  }
  if (args.report) {
    await fs.writeFile(args.report, JSON.stringify({ skipped, skippedDetail }, null, 2));
  }

  const perCategory = {};
  for (const record of publicRecords) {
    perCategory[record.category] = (perCategory[record.category] ?? 0) + 1;
  }

  return {
    rawFiles: files,
    badFiles,
    done,
    rowsRead: rows.length,
    imported: publicRecords.length,
    skipped,
    perCategory,
    imagesDownloaded: downloaded,
    imagesReused: reused,
    imageMbAdded: imageBytes / 1024 / 1024,
  };
}

function printSummary(args, s) {
  const line = (k, v) => console.log(`  ${k.padEnd(36)}${v}`);
  console.log("Catalog import summary");
  line("raw dir", args.raw);
  line(
    "raw files read",
    `${s.rawFiles.length} (${s.done ? "DONE marker present" : "no DONE marker yet"})`
  );
  for (const bad of s.badFiles) line("  unreadable file", `${bad.file}: ${bad.error}`);
  line("rows read", s.rowsRead);
  line("imported", s.imported);
  const skipTotal = Object.values(s.skipped).reduce((a, b) => a + b, 0);
  line("skipped", skipTotal);
  for (const [reason, count] of Object.entries(s.skipped).sort((a, b) => b[1] - a[1])) {
    line(`  ${reason}`, count);
  }
  console.log("  per category:");
  for (const [cat, count] of Object.entries(s.perCategory).sort()) line(`  ${cat}`, count);
  line("images downloaded", s.imagesDownloaded);
  line("images already present", s.imagesReused);
  line("image MB added", s.imageMbAdded.toFixed(2));
  if (args.dryRun) console.log("  (dry run: no JSON files written)");
  if (!args.images) console.log("  (--no-images: images were NOT checked or downloaded)");
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = parseArgs(process.argv.slice(2));
  runImport(args)
    .then((summary) => printSummary(args, summary))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
