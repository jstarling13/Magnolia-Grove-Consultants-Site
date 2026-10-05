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

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import {
  buildCatalog,
  checkOverrides,
  findLostProtectedIds,
  checkCategoryOverrides,
  checkKeepApart,
  findDuplicateImages,
  parseCategoryOverrides,
  parseKeepApart,
  parseOverrides,
  remapColorImageKeys,
  remapPhotoSamples,
  toPublicRecord,
} from "./lib/catalogClean.mjs";
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

/** ids, names and categories of the hand-curated products, read from merchandiseConfig.ts. */
export function readCuratedProducts(source) {
  const start = source.indexOf("const curatedProducts");
  const end = source.indexOf("// Per-color photos");
  if (start < 0 || end < 0) {
    throw new Error("Could not locate curatedProducts in merchandiseConfig.ts");
  }
  const block = source.slice(start, end);
  const ids = [...block.matchAll(/^ {4}id:\s*"([^"]+)"/gm)].map((m) => m[1]);
  const names = [...block.matchAll(/^ {4}name:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/gm)].map(
    (m) => {
      const lit = m[1];
      return lit[0] === '"' ? JSON.parse(lit) : lit.slice(1, -1).replace(/\\(.)/g, "$1");
    }
  );
  const categories = [...block.matchAll(/^ {4}category:\s*"([^"]+)"/gm)].map((m) => m[1]);
  if (ids.length === 0 || ids.length !== names.length || ids.length !== categories.length) {
    throw new Error(
      `Curated parse mismatch: ${ids.length} ids, ${names.length} names, ${categories.length} categories`
    );
  }
  return {
    ids,
    names,
    categories,
    products: ids.map((id, i) => ({ id, name: names[i], category: categories[i] })),
  };
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

const MANIFEST_REL = "scripts/data/import-manifest.json";
const REPORT_REL = "scripts/out/dedupe-report.md";
const OVERRIDES_REL = "scripts/data/import-overrides.json";

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Human-readable report of every duplicate cluster and curated duplicate. */
export function renderDedupeReport({
  clusters,
  curatedDuplicates,
  manualOverrides = [],
  keepApart = [],
  imageDuplicates = [],
  categoryMoved = [],
}) {
  const who = (m) =>
    `${m.name} -- ${m.supplier || m.asi || "unknown vendor"} (rating ${m.rating}, ${m.reviews} reviews, score ${m.score})`;
  const lines = ["# Catalog dedupe report", ""];
  lines.push(`Clusters with more than one member: ${clusters.length}`);
  lines.push(
    `Imported items dropped as duplicates of curated products: ${curatedDuplicates.length}`
  );
  lines.push("");
  lines.push(`Rows dropped by manual override: ${manualOverrides.length}`);
  lines.push("");
  lines.push("## Manual overrides (scripts/data/import-overrides.json)", "");
  for (const o of manualOverrides) {
    lines.push(`- dropped: ${who(o.dropped)}`);
    lines.push(`  reason: ${o.reason}`);
  }
  lines.push("");
  lines.push("## Category overrides applied", "");
  for (const m of categoryMoved) {
    lines.push(`- ${m.name}: ${m.from} -> ${m.to} (${m.reason})`);
  }
  lines.push("");
  lines.push("## Duplicate images (byte-identical photos)", "");
  for (const g of imageDuplicates) {
    lines.push(`- KEPT: ${g.kept.product.name} (${g.kept.link.supplier})`);
    for (const d of g.dropped)
      lines.push(`  dropped (duplicate-image): ${d.product.name} (${d.link.supplier})`);
  }
  lines.push("");
  lines.push("## Kept apart on purpose (keepApart)", "");
  for (const g of keepApart) {
    lines.push(
      `- espIds ${g.espIds.join(", ")} (in catalog: ${(g.inCatalog ?? []).join(", ") || "none"})`
    );
    lines.push(`  reason: ${g.reason}`);
  }
  lines.push("");
  lines.push("## Duplicate clusters", "");
  clusters.forEach((c, i) => {
    lines.push(`### Cluster ${i + 1}: ${c.kept.category}`);
    lines.push(`- KEPT: ${who(c.kept)}`);
    for (const d of c.dropped) lines.push(`- dropped (${d.reason}): ${who(d)}`);
    lines.push("");
  });
  lines.push("## Duplicates of curated products (curated wins)", "");
  for (const d of curatedDuplicates) {
    lines.push(`- dropped: ${who(d.dropped)}`);
    lines.push(`  matches curated: ${d.curated}`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Delete generated images that are no longer selected. Only ids the importer
 * itself produced are ever candidates: the previous manifest, the previous
 * importedProducts.json, and files downloaded this run. Never touches anything else.
 */
export async function removeOrphanImages({ imagesDir, previousIds, selectedIds }) {
  const selected = new Set(selectedIds);
  const removed = [];
  for (const id of [...new Set(previousIds)].sort()) {
    if (selected.has(id) || !/^[a-z0-9-]+$/.test(id)) continue;
    const file = path.join(imagesDir, `${id}.webp`);
    try {
      await fs.unlink(file);
      removed.push(id);
    } catch {
      // already gone
    }
  }
  return removed;
}

/**
 * Delete a color photo file ONLY if nothing references its path any more: not the
 * rewritten colorImages data, not any source/test/script text, not importedProducts.
 */
export async function deleteUnreferencedPhotos({ root, paths, files }) {
  const wanted = [...new Set(paths)].filter((p) => p.startsWith("/images/"));
  if (wanted.length === 0) return [];
  const corpus = [JSON.stringify(files.map((f) => f.data))];
  const skip = new Set(["node_modules", ".next", ".git", "public", "out"]);
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (
        /\.(?:[cm]?[jt]sx?|json|md)$/.test(entry.name) &&
        !/^colorImages(?:\.extra\d)?\.json$/.test(entry.name)
      ) {
        corpus.push(await fs.readFile(full, "utf8"));
      }
    }
  };
  for (const dir of ["src", "__tests__", "scripts"]) {
    await walk(path.join(root, dir)).catch(() => {});
  }
  const text = corpus.join("\n");
  const deleted = [];
  for (const p of wanted) {
    if (text.includes(p)) continue;
    try {
      await fs.unlink(path.join(root, "public", p));
      deleted.push(p);
    } catch {
      // already gone
    }
  }
  return deleted;
}

export async function runImport(args) {
  const root = args.root;
  const imagesDir = path.join(root, "public/images/merch");
  const productsFile = path.join(root, "src/config/importedProducts.json");
  const linksFile = path.join(root, "src/lib/espLinks.imported.json");
  const manifestFile = path.join(root, MANIFEST_REL);
  const reportFile = path.join(root, REPORT_REL);
  const overridesFile = path.join(root, OVERRIDES_REL);
  const colorImageFiles = [
    "colorImages.json",
    "colorImages.extra1.json",
    "colorImages.extra2.json",
    "colorImages.extra3.json",
    "colorImages.extra4.json",
    "colorImages.extra5.json",
    "colorImages.extra6.json",
    "colorImages.extra7.json",
  ].map((name) => path.join(root, "src/config", name));
  const photoSamplesFile = path.join(root, "__tests__/fixtures/colorPhotoSamples.json");
  const curatedLinksFile = path.join(root, "src/lib/espLinks.curated.json");

  const curated = readCuratedProducts(
    await fs.readFile(path.join(REPO_ROOT, "src/config/merchandiseConfig.ts"), "utf8")
  );
  const { rows, files, badFiles, done } = await readRawRows(args.raw);
  const overridesJson = await readJsonIfExists(overridesFile, {});
  const overrides = parseOverrides(overridesJson);
  const keepApart = parseKeepApart(overridesJson);
  const categoryOverrides = parseCategoryOverrides(overridesJson);
  // espIds already in the catalog win ties between equal twins, keeping existing ids stable
  const previousLinks0 = await readJsonIfExists(linksFile, {});
  const preferEspIds = Object.values(previousLinks0).map((l) => String(l?.espId ?? ""));
  const buildOpts = {
    preferEspIds,
    curated: curated.products,
    dropEspIds: overrides,
    keepApart,
    categoryOverrides,
  };

  // Select rows; fetch images for the winners. If a winner's image cannot be fetched it is
  // rejected and the cluster's runner-up is used; products whose images are byte-identical
  // are duplicates (best vendor kept), found by hashing the files, then re-selecting.
  const rejectedEspIds = new Set();
  const duplicateImageEspIds = new Set();
  const imageDuplicateGroups = [];
  const failures = [];
  const touched = new Set(); // ids downloaded during this run
  // a dry run never writes into public/: new downloads go to a scratch directory
  const storeDir = args.dryRun ? path.join(os.tmpdir(), "mg-catalog-dryrun-images") : imagesDir;
  const imageFile = async (item) => {
    for (const dir of args.dryRun ? [imagesDir, storeDir] : [imagesDir]) {
      const file = path.join(dir, `${item.id}.webp`);
      try {
        if ((await fs.stat(file)).size > 0) return file;
      } catch {
        // keep looking
      }
    }
    return null;
  };
  const ensure = async (item) => {
    if (args.dryRun) {
      const existing = await imageFile(item);
      if (existing && !existing.startsWith(storeDir)) return { status: "exists", bytes: 0 };
    }
    return ensureImage(item, storeDir);
  };
  let imageBytes = 0;
  let downloaded = 0;
  let reused = 0;
  let result;
  if (args.images) await fs.mkdir(storeDir, { recursive: true });
  for (let round = 0; round < 10; round++) {
    result = buildCatalog(rows, { ...buildOpts, rejectedEspIds, duplicateImageEspIds });
    if (!args.images) break;
    const outcomes = await mapConcurrent(result.items, DOWNLOAD_CONCURRENCY, ensure);
    let changed = 0;
    outcomes.forEach((outcome, i) => {
      const item = result.items[i];
      if (outcome.status === "failed") {
        rejectedEspIds.add(item.link.espId);
        failures.push({ espId: item.link.espId, name: item.product.name, error: outcome.error });
        changed++;
      } else if (outcome.status === "downloaded") {
        touched.add(item.id);
        downloaded++;
        imageBytes += outcome.bytes;
      }
    });
    if (changed === 0) {
      const hashes = new Map();
      for (const item of result.items) {
        const file = await imageFile(item);
        if (file) {
          hashes.set(
            item.link.espId,
            crypto
              .createHash("sha256")
              .update(await fs.readFile(file))
              .digest("hex")
          );
        }
      }
      const { losers, groups } = findDuplicateImages(result.items, hashes);
      for (const l of losers) duplicateImageEspIds.add(l.espId);
      imageDuplicateGroups.push(...groups);
      changed = losers.length;
    }
    if (changed === 0) break;
  }
  const {
    items,
    skipped,
    skippedDetail,
    clusters,
    curatedDuplicates,
    manualOverrides,
    categoryMoved,
  } = result;
  reused = args.images ? items.length - items.filter((i) => touched.has(i.id)).length : 0;

  const publicRecords = items.map(toPublicRecord);
  const links = Object.fromEntries(items.map((item) => [item.id, item.link]));

  // ---- safety: overrides must be live and have a replacement ---------------------
  const warnings = checkOverrides({
    overrides,
    rawEspIds: rows.map((r) => (Array.isArray(r) ? String(r[0]).trim() : "")),
    selectedEspIds: items.map((i) => i.link.espId),
    curatedIds: curated.ids,
  });

  const rawEspIds = rows.map((r) => (Array.isArray(r) ? String(r[0]).trim() : ""));
  warnings.push(...checkKeepApart({ keepApart, rawEspIds }));
  warnings.push(...checkCategoryOverrides({ categoryOverrides, rawEspIds }));
  const keptEspIds = new Set(items.map((i) => i.link.espId));
  const keepApartStatus = keepApart.map((g) => ({
    ...g,
    inCatalog: g.espIds.filter((id) => keptEspIds.has(id)),
  }));
  for (const g of keepApartStatus) {
    if (g.inCatalog.length < g.espIds.length) {
      warnings.push(
        `keepApart group [${g.espIds.join(", ")}]: only ${g.inCatalog.length} of ${g.espIds.length} are in the catalog (others dropped by another rule)`
      );
    }
  }

  // ---- safety: products with hand-sourced data must keep their id ------------------
  const previousProducts = await readJsonIfExists(productsFile, []);
  const colorImageData = await Promise.all(
    colorImageFiles.map(async (file) => ({ file, data: await readJsonIfExists(file, {}) }))
  );
  const protectedPhotoIds = colorImageData.flatMap(({ data }) => Object.keys(data));
  const curatedLinks = await readJsonIfExists(curatedLinksFile, {});
  const lostAll = findLostProtectedIds({
    previousIds: previousProducts.map((p) => p.id),
    selectedIds: items.map((i) => i.id),
    protectedIds: [...protectedPhotoIds, ...Object.keys(curatedLinks)],
  });
  // A product dropped on purpose by a manual override may leave behind an unused
  // curated ESP link entry; that is reported, not fatal. Color photos always are.
  const previousLinks = await readJsonIfExists(linksFile, {});
  const overridden = new Set(overrides.map((o) => o.espId));
  const lost = [];
  for (const id of lostAll) {
    if (overridden.has(String(previousLinks[id]?.espId)) && !protectedPhotoIds.includes(id)) {
      warnings.push(
        `override dropped ${id}: its entry in src/lib/espLinks.curated.json is now unused (owned by esp-links; safe to delete)`
      );
    } else {
      lost.push(id);
    }
  }
  if (lost.length > 0) {
    throw new Error(
      `STOPPED, nothing written: these products have color photos or curated ESP links but ` +
        `would lose their id with the current raw data: ${lost.join(", ")}`
    );
  }
  const remapped = remapColorImageKeys(
    colorImageData,
    items.map((i) => ({ id: i.id, colors: i.product.colors, colorMap: i.colorMap }))
  );
  if (remapped.unresolved.length > 0) {
    throw new Error(
      `STOPPED, nothing written: color photo keys that no longer match any color: ${remapped.unresolved.join("; ")}`
    );
  }

  let orphansRemoved = [];
  let unreferencedPhotos = [];
  if (!args.dryRun) {
    for (const { file, data } of remapped.files) {
      const before = colorImageData.find((f) => f.file === file).data;
      if (JSON.stringify(before) !== JSON.stringify(data)) {
        await writeIfChanged(file, await formatJson(root, JSON.stringify(data)));
      }
    }
    const samples = await readJsonIfExists(photoSamplesFile, null);
    if (Array.isArray(samples)) {
      const { samples: nextSamples, changed } = remapPhotoSamples(samples, remapped.moves);
      if (changed > 0) {
        // same layout as scripts/colorCoverage.mjs --sample: one sample per line
        const lines = nextSamples.map((row) => "  " + JSON.stringify(row));
        await writeIfChanged(photoSamplesFile, "[\n" + lines.join(",\n") + "\n]\n");
      }
    }
    unreferencedPhotos = await deleteUnreferencedPhotos({
      root,
      paths: remapped.removedPaths,
      files: remapped.files,
    });
    const manifest = await readJsonIfExists(manifestFile, { generated: [] });
    await writeIfChanged(productsFile, await formatJson(root, JSON.stringify(publicRecords)));
    await writeIfChanged(linksFile, await formatJson(root, JSON.stringify(links)));
    if (args.images) {
      orphansRemoved = await removeOrphanImages({
        imagesDir,
        previousIds: [
          ...(manifest.generated ?? []),
          ...previousProducts.map((p) => p.id),
          ...touched,
        ],
        selectedIds: items.map((i) => i.id),
      });
      await fs.mkdir(path.dirname(manifestFile), { recursive: true });
      await writeIfChanged(
        manifestFile,
        await formatJson(root, JSON.stringify({ generated: items.map((i) => i.id).sort() }))
      );
    }
  }
  // report lives in a self-ignoring scripts/out directory (never committed)
  await fs.mkdir(path.dirname(reportFile), { recursive: true });
  await fs.writeFile(path.join(path.dirname(reportFile), ".gitignore"), "*\n");
  await fs.writeFile(
    reportFile,
    renderDedupeReport({
      clusters,
      curatedDuplicates,
      manualOverrides,
      keepApart: keepApartStatus,
      imageDuplicates: imageDuplicateGroups,
      categoryMoved,
    })
  );
  if (args.report) {
    await fs.writeFile(
      args.report,
      JSON.stringify(
        {
          skipped,
          skippedDetail,
          failures,
          clusters,
          curatedDuplicates,
          manualOverrides,
          categoryMoved,
          imageDuplicates: imageDuplicateGroups.map((g) => ({
            kept: g.kept.product.name,
            dropped: g.dropped.map((d) => d.product.name),
          })),
          items: items.map((i) => ({
            id: i.id,
            espId: i.link.espId,
            name: i.product.name,
            category: i.product.category,
            brand: i.product.brand,
            tiers: i.product.tiers,
            description: i.product.description,
          })),
        },
        null,
        2
      )
    );
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
    clusters: clusters.length,
    perCategory,
    imagesDownloaded: downloaded,
    imagesReused: reused,
    imageMbAdded: imageBytes / 1024 / 1024,
    orphansRemoved,
    reportFile,
    warnings,
    colorKeysRenamed: remapped.renamed,
    colorKeysDropped: remapped.dropped,
    colorKeysMerged: remapped.merged,
    colorPhotosDeleted: unreferencedPhotos,
    colorMoves: remapped.moves,
    categoryMoved: categoryMoved.length,
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
  line("dropped: low vendor rating", s.skipped["low-vendor-rating"] ?? 0);
  line("dropped: excluded supplier", s.skipped["excluded-supplier"] ?? 0);
  line("dropped: manual override", s.skipped["manual-override"] ?? 0);
  line("dropped: moq too high (> 1000)", s.skipped["moq-too-high"] ?? 0);
  line("dropped: first-tier price too high", s.skipped["price-too-high"] ?? 0);
  line("dropped: duplicate image", s.skipped["duplicate-image"] ?? 0);
  line("category overrides applied", s.categoryMoved);
  line("dropped: duplicate of curated", s.skipped["duplicate-of-curated"] ?? 0);
  line("dropped: duplicate, other vendor", s.skipped["duplicate-other-vendor"] ?? 0);
  line("dropped: duplicate, same vendor", s.skipped["duplicate-same-vendor"] ?? 0);
  line("duplicate clusters (>1 member)", s.clusters);
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
  line("orphan images removed", s.orphansRemoved.length);
  line("color photo keys renamed", s.colorKeysRenamed);
  line("color photo keys dropped (non-color)", s.colorKeysDropped);
  line("color photo keys merged (same name)", s.colorKeysMerged);
  line("color photo files deleted (unreferenced)", s.colorPhotosDeleted.length);
  line("dedupe report", s.reportFile);
  for (const w of s.warnings) console.warn(`WARNING: ${w}`);
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
