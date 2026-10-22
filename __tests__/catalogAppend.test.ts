// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { runAppend } from "../scripts/importCatalog.mjs";

type Row = (string | number | string[] | number[][])[];
type AppendArgs = {
  raw: string;
  root: string;
  images: boolean;
  dryRun: boolean;
  report: string | null;
  append: boolean;
  rawGiven: boolean;
  fetchBuffer?: (url: string) => Promise<Uint8Array>;
};

/** positional raw row, schema in scripts/lib/catalogClean.mjs */
function row(
  espId: string,
  name: string,
  tag: string,
  asi: string,
  rating = 4.8,
  reviews = 120,
  price = 4.25
): Row {
  return [
    espId,
    `P${espId}`,
    name,
    `${name} with a clean finish, sturdy build and a roomy imprint area for your logo.`,
    ["Black", "Navy"],
    "",
    [
      [50, price],
      [100, price - 0.5],
      [250, price - 1],
    ],
    "329709415",
    `Supplier ${asi}`,
    asi,
    rating,
    reviews,
    0,
    tag,
    0,
  ];
}

function args(root: string, raw: string, extra: Partial<AppendArgs> = {}): AppendArgs {
  return {
    raw,
    root,
    images: false,
    dryRun: false,
    report: null,
    append: true,
    rawGiven: true,
    ...extra,
  };
}

async function writeRaw(dir: string, rows: Row[], file = "batch1.json") {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, file), JSON.stringify(rows));
}

/** every file under dir -> content hash, for "nothing changed" checks */
async function snapshot(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const walk = async (d: string) => {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else {
        out[path.relative(dir, full)] = crypto
          .createHash("sha1")
          .update(await fs.readFile(full))
          .digest("hex");
      }
    }
  };
  await walk(dir);
  return out;
}

const SEED: Row[] = [
  row("700000101", "Bamboo Fiber Coffee Travel Mug With Lid", "drinkware", "asi/1001"),
  row("700000102", "Reflective Pet Safety Leash", "outdoor", "asi/1002"),
  row("700000103", "Solar Powered Desk Clock", "office", "asi/1003"),
];

let tmp: string;
let n = 0;

/** a temp repo root whose "existing" catalog was produced by the real pipeline from SEED */
async function makeRoot(): Promise<string> {
  const root = path.join(tmp, `root${n++}`);
  await fs.mkdir(path.join(root, "src/config"), { recursive: true });
  await fs.mkdir(path.join(root, "src/lib"), { recursive: true });
  await fs.mkdir(path.join(root, "scripts/data"), { recursive: true });
  await fs.mkdir(path.join(root, "public/images/merch"), { recursive: true });
  await fs.writeFile(path.join(root, "src/config/importedProducts.json"), "[]\n");
  await fs.writeFile(path.join(root, "src/lib/espLinks.imported.json"), "{}\n");
  await fs.writeFile(
    path.join(root, "src/lib/espLinks.curated.json"),
    JSON.stringify({
      "curated-thing": { espId: "700000900", supplier: "S", asi: "asi/9", productNo: "C1" },
    })
  );
  await fs.writeFile(path.join(root, "scripts/data/import-manifest.json"), '{ "generated": [] }\n');
  // files the importer must never touch
  await fs.writeFile(
    path.join(root, "src/config/colorImages.json"),
    '{ "a": { "Red": "/x.webp" } }\n'
  );
  await fs.writeFile(path.join(root, "src/config/photoReviewed.json"), '["a"]\n');
  const seedDir = path.join(root, "seed-raw");
  await writeRaw(seedDir, SEED);
  const seeded = await runAppend(args(root, seedDir));
  expect(seeded.added).toBe(3);
  return root;
}

const NEW_BATCH: Row[] = [
  row("700000201", "Recycled Cotton Market Tote Bag", "bags", "asi/2001", 4.9, 200), // adds
  row("700000202", "Recycled Cotton Market Tote Bag", "bags", "asi/2002", 4.6, 20), // earlier new row wins
  row("700000203", "Bamboo Fiber Coffee Travel Mug With Lid", "drinkware", "asi/2003"), // dup of existing
  row("700000204", "Canvas Garden Apron", "bags", "asi/2004", 4.2, 300), // below vendor gate
  row("700000205", "Folding Camp Stool", "outdoor", "asi/38120"), // Ball Pro, excluded
  row("700000101", "Bamboo Coffee Mug Renamed", "drinkware", "asi/2005"), // espId already imported
  row("700000900", "Curated Linked Thing", "gifts", "asi/2006"), // espId in curated links
  row("700000206", "Magnetic Dry Erase Weekly Planner Board", "office", "asi/2007"), // adds
];

describe("catalog append mode", () => {
  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mg-append-"));
  });
  afterAll(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("appends survivors, keeps existing records byte-identical and drops the rest", async () => {
    const root = await makeRoot();
    const files = {
      products: path.join(root, "src/config/importedProducts.json"),
      links: path.join(root, "src/lib/espLinks.imported.json"),
      manifest: path.join(root, "scripts/data/import-manifest.json"),
    };
    const oldProducts = await fs.readFile(files.products, "utf8");
    const oldLinks = await fs.readFile(files.links, "utf8");
    const oldProtected = await Promise.all(
      ["src/config/colorImages.json", "src/config/photoReviewed.json"].map((f) =>
        fs.readFile(path.join(root, f), "utf8")
      )
    );
    const raw = path.join(root, "raw");
    await writeRaw(raw, NEW_BATCH);

    const summary = await runAppend(args(root, raw));

    expect(summary.rowsRead).toBe(8);
    expect(summary.added).toBe(2);
    expect(summary.skipped["low-vendor-rating"]).toBe(1);
    expect(summary.skipped["excluded-supplier"]).toBe(1);
    expect(summary.skipped["already-imported"]).toBe(1);
    expect(summary.skipped["already-curated"]).toBe(1);
    expect(summary.skipped["duplicate-of-existing"]).toBe(1);
    expect(summary.skipped["duplicate-other-vendor"]).toBe(1);

    // existing bytes are a strict prefix of the new files (only a comma and the new records follow)
    const newProducts = await fs.readFile(files.products, "utf8");
    const newLinks = await fs.readFile(files.links, "utf8");
    expect(
      newProducts.startsWith(oldProducts.slice(0, oldProducts.lastIndexOf("\n]")) + ",\n")
    ).toBe(true);
    expect(newLinks.startsWith(oldLinks.slice(0, oldLinks.lastIndexOf("\n}")) + ",\n")).toBe(true);

    const before = JSON.parse(oldProducts);
    const after = JSON.parse(newProducts);
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after).toHaveLength(before.length + 2);
    // new records follow in raw row order
    expect(after.slice(before.length).map((p: { name: string }) => p.name)).toEqual([
      "Recycled Cotton Market Tote Bag",
      "Magnetic Dry Erase Weekly Planner Board",
    ]);
    // browser-safe records never carry ESP data
    expect(JSON.stringify(after)).not.toMatch(/espId|supplier|asi\/|productNo/);

    // server-only links written for the new ids only
    const links = JSON.parse(newLinks);
    for (const rec of after.slice(before.length)) {
      expect(links[rec.id].espId).toMatch(/^7000002/);
    }
    expect(Object.keys(links)).toHaveLength(5);
    expect(Object.keys(JSON.parse(oldLinks))).toEqual(Object.keys(links).slice(0, 3));

    // manifest lists every generated id, sorted
    const manifest = JSON.parse(await fs.readFile(files.manifest, "utf8"));
    expect(manifest.generated).toEqual(after.map((p: { id: string }) => p.id).sort());

    // files the append must never touch
    const nowProtected = await Promise.all(
      ["src/config/colorImages.json", "src/config/photoReviewed.json"].map((f) =>
        fs.readFile(path.join(root, f), "utf8")
      )
    );
    expect(nowProtected).toEqual(oldProtected);
  });

  it("is a no-op when run a second time with the same raw input", async () => {
    const root = await makeRoot();
    const raw = path.join(root, "raw");
    await writeRaw(raw, NEW_BATCH);
    await runAppend(args(root, raw));
    const afterFirst = await snapshot(root);
    const second = await runAppend(args(root, raw));
    expect(second.added).toBe(0);
    expect(second.skipped["already-imported"]).toBe(3); // the two new rows + the duplicate-espId row
    expect(await snapshot(root)).toEqual(afterFirst);
  });

  it("dry run reports counts and writes nothing", async () => {
    const root = await makeRoot();
    const raw = path.join(root, "raw");
    await writeRaw(raw, NEW_BATCH);
    const before = await snapshot(root);
    const summary = await runAppend(args(root, raw, { dryRun: true }));
    expect(summary.dryRun).toBe(true);
    expect(summary.wouldAdd).toBe(2);
    expect(summary.added).toBe(0);
    expect(await snapshot(root)).toEqual(before);
  });

  it("drops a cross-supplier near-duplicate of an existing product (existing wins)", async () => {
    const root = await makeRoot();
    const raw = path.join(root, "raw");
    await writeRaw(raw, [
      row(
        "700000301",
        "Bamboo Fiber Coffee Travel Mug Lid Reusable Eco Friendly",
        "drinkware",
        "asi/3001"
      ),
      row("700000302", "Hemp Drawstring Backpack", "bags", "asi/3002"),
    ]);
    const summary = await runAppend(args(root, raw));
    expect(summary.added).toBe(1);
    expect(summary.skipped["near-duplicate-of-existing"]).toBe(1);
    expect(summary.newIds[0]).toMatch(/^hemp-drawstring-backpack-/);
  });

  it("downloads images for new products only and never touches existing images", async () => {
    const root = await makeRoot();
    const imagesDir = path.join(root, "public/images/merch");
    const existingProducts = JSON.parse(
      await fs.readFile(path.join(root, "src/config/importedProducts.json"), "utf8")
    );
    // existing images, with sentinel bytes
    for (const p of existingProducts) {
      await fs.writeFile(path.join(imagesDir, `${p.id}.webp`), `existing:${p.id}`);
    }
    const before = await snapshot(imagesDir);
    const raw = path.join(root, "raw");
    await writeRaw(raw, NEW_BATCH);
    const urls: string[] = [];
    const fetchBuffer = async (url: string) => {
      urls.push(url);
      return sharp({
        create: {
          width: 96,
          height: 96,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
          noise: { type: "gaussian", mean: 128, sigma: 70 },
        },
      })
        .png()
        .toBuffer();
    };
    const summary = await runAppend(args(root, raw, { images: true, fetchBuffer }));
    expect(summary.added).toBe(2);
    expect(summary.imagesDownloaded).toBe(2);
    expect(urls).toHaveLength(2);
    const after = await snapshot(imagesDir);
    for (const [file, hash] of Object.entries(before)) expect(after[file]).toBe(hash);
    for (const id of summary.newIds) expect(after[`${id}.webp`]).toBeDefined();
    expect(Object.keys(after)).toHaveLength(Object.keys(before).length + 2);
  });

  it("rejects a new row whose image cannot be fetched and writes no image for it", async () => {
    const root = await makeRoot();
    const raw = path.join(root, "raw");
    await writeRaw(raw, [row("700000401", "Hemp Drawstring Backpack", "bags", "asi/4001")]);
    const fetchBuffer = async () => new Uint8Array(100); // placeholder-sized
    const summary = await runAppend(args(root, raw, { images: true, fetchBuffer }));
    expect(summary.added).toBe(0);
    expect(summary.skipped["image-failed"]).toBe(1);
    expect(await fs.readdir(path.join(root, "public/images/merch"))).toEqual([]);
  });

  it("refuses to rewrite an existing catalog file that is not in the importer format", async () => {
    const root = await makeRoot();
    const file = path.join(root, "src/config/importedProducts.json");
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    await fs.writeFile(file, JSON.stringify(parsed) + "\n"); // compact, not prettier-formatted
    const before = await snapshot(root);
    const raw = path.join(root, "raw");
    await writeRaw(raw, NEW_BATCH);
    await expect(runAppend(args(root, raw))).rejects.toThrow(/nothing written/);
    expect(await snapshot(root)).toEqual({ ...before, "raw/batch1.json": expect.any(String) });
  });
});
