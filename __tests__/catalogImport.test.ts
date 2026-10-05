// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  buildCatalog,
  buildDescription,
  cleanColors,
  cleanRow,
  cleanTiers,
  detectBrand,
  makeUniqueId,
  normalizeName,
  slugify,
  stripBadge,
  toPublicRecord,
} from "../scripts/lib/catalogClean.mjs";
import { compressImage, ensureImage, mapConcurrent } from "../scripts/lib/catalogImages.mjs";
import { readCuratedProducts } from "../scripts/importCatalog.mjs";
import {
  MARKUP_RATE,
  isImportedProductRecord,
  merchandiseCategories,
  products,
  toImportedProduct,
} from "../src/config/merchandiseConfig";
import importedProductsJson from "../src/config/importedProducts.json";
import fixtureRows from "./fixtures/catalogImport.fixture.raw.json";

// The fixture is synthetic test input only; it is never used as product data.
const rows = fixtureRows as unknown[];
const FORBIDDEN_PUBLIC_KEYS = ["espId", "supplier", "asi", "productNo", "imgId", "link"];

describe("slugify / ids", () => {
  it("makes a lowercase ascii slug without trademark symbols", () => {
    expect(slugify("Nike® Dri-FIT™ Café Polo & Co.")).toBe("nike-dri-fit-cafe-polo-and-co");
  });

  it("caps the slug at 60 chars with no trailing dash", () => {
    const slug = slugify("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("falls back to a placeholder slug for symbol-only names", () => {
    expect(slugify("®™")).toBe("product");
  });

  it("appends the last 5 digits of the ESP id", () => {
    expect(makeUniqueId("Test Mug", "123456789", new Map())).toBe("test-mug-56789");
  });

  it("is stable for the same product and widens the suffix on collision", () => {
    const taken = new Map<string, string>();
    const a = makeUniqueId("Same Name", "1100012345", taken)!;
    taken.set(a, "1100012345");
    expect(makeUniqueId("Same Name", "1100012345", taken)).toBe(a);
    const b = makeUniqueId("Same Name", "2200012345", taken)!;
    expect(b).not.toBe(a);
    expect(b).toBe("same-name-00012345");
  });

  it("never reuses a curated id", () => {
    const taken = new Map([["test-mug-56789", ""]]);
    expect(makeUniqueId("Test Mug", "123456789", taken)).not.toBe("test-mug-56789");
  });
});

describe("description / badge / colors", () => {
  it("strips leading badge words", () => {
    expect(stripBadge("Trending Soft polo")).toBe("Soft polo");
    expect(stripBadge("New: Soft polo")).toBe("Soft polo");
    expect(stripBadge("Best Seller Soft polo")).toBe("Soft polo");
    expect(stripBadge("Hot Popular Soft polo")).toBe("Soft polo");
    expect(stripBadge("TrendingA durable mug")).toBe("A durable mug");
  });

  it("does not strip words that merely start with a badge word", () => {
    expect(stripBadge("Newsletter holder")).toBe("Newsletter holder");
    expect(stripBadge("New Era branded cap")).toBe("New Era branded cap");
    expect(stripBadge("Hotel amenity kit")).toBe("Hotel amenity kit");
  });

  it("strips Show more / Show less suffixes, dedupes case-insensitively, caps at 30", () => {
    expect(cleanColors(["Red", "red ", "Navy", "", "White Show less", "Blue  show MORE"])).toEqual([
      "Red",
      "Navy",
      "White",
      "Blue",
    ]);
    const many = Array.from({ length: 45 }, (_, i) => `Color ${i}`);
    const row = [
      "1",
      "p",
      "Name",
      "",
      many,
      "",
      [[1, 1]],
      "5",
      "s",
      "asi/1",
      0,
      0,
      0,
      "apparel",
      0,
    ];
    expect(cleanRow(row).product?.colors).toHaveLength(30);
  });

  it("builds a factual fallback description and the Priced-at sentence", () => {
    expect(
      buildDescription({
        rawDescription: "",
        colorCount: 3,
        sizes: "S-XL",
        minQty: 25,
        usa: 0,
        multiGrid: 0,
      })
    ).toBe("3 color options. Size: S-XL. Priced at 25 units.");
    expect(
      buildDescription({
        rawDescription: "",
        colorCount: 1,
        sizes: "",
        minQty: 1,
        usa: 0,
        multiGrid: 0,
      })
    ).toBe("1 color option. Priced at 1 unit.");
  });

  it("adds the USA and multi-grid sentences only when the row says so", () => {
    const base = { rawDescription: "Trending Great tee", colorCount: 2, sizes: "", minQty: 6 };
    expect(buildDescription({ ...base, usa: 1, multiGrid: 1 })).toBe(
      "Made in the USA. Great tee. Pricing shown is for the base size or option; other sizes or options may cost more. Priced at 6 units."
    );
    expect(buildDescription({ ...base, usa: 0, multiGrid: 0 })).toBe(
      "Great tee. Priced at 6 units."
    );
  });
});

describe("tiers", () => {
  it("sorts, dedupes quantities, drops non-positive entries, keeps at most 5", () => {
    expect(
      cleanTiers([
        [100, 3.0],
        [0, 9.0],
        [25, 0],
        [10, 5.0],
        [10, 4.9],
      ])
    ).toEqual([
      [10, 5.0],
      [100, 3.0],
    ]);
    const seven = Array.from({ length: 7 }, (_, i) => [i + 1, 10 - i]);
    expect(cleanTiers(seven)).toEqual([
      [1, 10],
      [2, 9],
      [3, 8],
      [4, 7],
      [5, 6],
    ]);
  });
});

describe("brand detection", () => {
  it("matches the start of the name, case-insensitively, with word boundaries", () => {
    expect(detectBrand("Nike® Dri-FIT Polo")).toBe("Nike");
    expect(detectBrand("PORT AUTHORITY Fleece")).toBe("Port Authority");
    expect(detectBrand("Sport Tek Hoodie")).toBe("Sport-Tek");
    expect(detectBrand("The North Face Jacket")).toBe("The North Face");
    expect(detectBrand("Bella+Canvas Tee")).toBe("Bella+Canvas");
    expect(detectBrand("Cutter & Buck Polo")).toBe("Cutter & Buck");
  });

  it("falls back to Essentials for unbranded, mid-name and partial-word matches", () => {
    expect(detectBrand("Classic Nike Tee")).toBe("Essentials");
    expect(detectBrand("Nikeish Tee")).toBe("Essentials");
    expect(detectBrand("Buckle Tote")).toBe("Essentials");
    expect(detectBrand("Cross Body Bag")).toBe("Essentials");
    expect(detectBrand("Cross® Click Pen")).toBe("Cross");
  });
});

describe("buildCatalog on the synthetic fixture", () => {
  const curated = {
    curatedNames: ["Nike® Dri-FIT Micro Pique 2.0 Polo"],
    curatedIds: ["nike-dri-fit-polo"],
  };
  const result = buildCatalog(rows, curated);

  it("skips each bad row for the right reason", () => {
    expect(result.skipped).toEqual({
      "duplicate-espid": 1,
      "duplicate-supplier-productno": 1,
      "no-tiers": 1,
      "price-too-high": 1,
      "no-image": 1,
      "name-too-long": 1,
      "unknown-tag": 1,
      "duplicate-of-curated": 1,
      "malformed-row": 1,
    });
    expect(result.items.map((i) => i.product.name)).toEqual([
      "Nike® Dri-FIT Polo Test",
      "Fixture Travel Mug",
      "Fixture Golf Umbrella",
      "Fixture Collision Item",
      "Fixture Collision Item",
      "Fixture Messy Tiers",
      "Fixture Wellness Kit",
    ]);
  });

  it("maps tags (including legacy ones) to site categories", () => {
    const byName = new Map(result.items.map((i) => [i.product.name, i.product]));
    expect(byName.get("Nike® Dri-FIT Polo Test")!.category).toBe("Apparel");
    expect(byName.get("Fixture Golf Umbrella")!.category).toBe("Outdoor & Sports");
    expect(byName.get("Fixture Wellness Kit")!.category).toBe("Health & Wellness");
    for (const item of result.items) {
      expect(merchandiseCategories).toContain(item.product.category);
    }
  });

  it("produces globally unique ids, including colliding last-5 suffixes", () => {
    const ids = result.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const collisions = result.items.filter((i) => i.product.name === "Fixture Collision Item");
    expect(collisions[0].id).toBe("fixture-collision-item-12345");
    expect(collisions[1].id).not.toBe(collisions[0].id);
    expect(ids).not.toContain("nike-dri-fit-polo");
  });

  it("cleans the first row end to end", () => {
    const first = result.items[0];
    expect(first.product.brand).toBe("Nike");
    expect(first.product.colors).toEqual(["Black", "Navy", "White"]);
    expect(first.product.tiers).toEqual([
      [1, 25],
      [12, 20.5],
      [48, 18],
      [100, 17.5],
      [250, 17],
    ]);
    expect(first.product.description).toBe(
      "Made in the USA. Soft polo with a clean finish. Pricing shown is for the base size or option; other sizes or options may cost more. Priced at 1 unit."
    );
    expect(first.product.imageAlt).toBe(first.product.name);
  });

  it("is deterministic and idempotent", () => {
    expect(JSON.stringify(buildCatalog(rows, curated))).toBe(JSON.stringify(result));
  });

  it("keeps ESP/supplier identifiers out of the public record", () => {
    for (const item of result.items) {
      const record = toPublicRecord(item);
      for (const key of FORBIDDEN_PUBLIC_KEYS) expect(record).not.toHaveProperty(key);
      expect(record.image).toBe(`/images/merch/${item.id}.webp`);
      expect(isImportedProductRecord(record)).toBe(true);
    }
    expect(result.items[0].link).toEqual({
      espId: "100000001",
      supplier: "Acme Apparel",
      asi: "asi/10001",
      productNo: "PN-1",
    });
  });
});

describe("markup is applied exactly once, through tiers()", () => {
  it("toImportedProduct keeps the ESP price and adds one 5% markup", () => {
    const product = toImportedProduct({
      id: "x-00001",
      name: "X",
      category: "Apparel",
      brand: "Essentials",
      description: "d",
      tiers: [
        [1, 10],
        [50, 7.331],
      ],
      image: "/images/merch/x-00001.webp",
      imageAlt: "X",
      colors: [],
    });
    expect(MARKUP_RATE).toBe(0.05);
    expect(product.priceTiers).toEqual([
      { quantity: 1, espPrice: 10, price: 10.5 },
      { quantity: 50, espPrice: 7.331, price: 7.7 },
    ]);
  });

  it("every shipped imported record is valid, secret-free, and priced once", () => {
    const records = importedProductsJson as unknown[];
    const ids = new Set<string>();
    const curated = new Set(
      products
        .map((p) => p.id)
        .filter((id) => !records.some((r) => (r as { id: string }).id === id))
    );
    for (const record of records) {
      expect(isImportedProductRecord(record)).toBe(true);
      const r = record as { id: string; tiers: [number, number][] };
      for (const key of FORBIDDEN_PUBLIC_KEYS) expect(record).not.toHaveProperty(key);
      expect(ids.has(r.id)).toBe(false);
      expect(curated.has(r.id)).toBe(false);
      ids.add(r.id);
      const product = products.find((p) => p.id === r.id)!;
      expect(product).toBeDefined();
      product.priceTiers.forEach((tier, i) => {
        expect(tier.espPrice).toBe(r.tiers[i][1]);
        expect(tier.price).toBe(Math.round(r.tiers[i][1] * 1.05 * 100) / 100);
      });
    }
  });

  it("imported ids never collide with the curated catalog", () => {
    const ids = products.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("curated catalog parsing", () => {
  it("reads every curated id and name from merchandiseConfig.ts", async () => {
    const source = await fs.readFile(
      path.join(__dirname, "../src/config/merchandiseConfig.ts"),
      "utf8"
    );
    const curated = readCuratedProducts(source);
    expect(curated.ids.length).toBe(curated.names.length);
    expect(curated.ids).toContain("nike-dri-fit-polo");
    const shipped = new Set(products.map((p) => p.id));
    for (const id of curated.ids) expect(shipped.has(id)).toBe(true);
    expect(normalizeName(curated.names[0])).toBe(
      normalizeName(products.find((p) => p.id === curated.ids[0])!.name)
    );
  });

  it("re-tags the three caps to Headwear", () => {
    for (const id of [
      "imperial-original-performance-cap",
      "6panel-upf-stretch-cap",
      "6panel-premium-relaxed-golf-cap",
    ]) {
      expect(products.find((p) => p.id === id)?.category).toBe("Headwear");
    }
  });
});

describe("image pipeline", () => {
  async function makePng(width: number, height: number) {
    return sharp({
      create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } },
    })
      .png()
      .toBuffer();
  }

  it("fits inside 900x900 without enlarging small images", async () => {
    const big = await sharp(await compressImage(await makePng(2000, 1000))).metadata();
    expect([big.width, big.height]).toEqual([900, 450]);
    expect(big.format).toBe("webp");
    const small = await sharp(await compressImage(await makePng(300, 200))).metadata();
    expect([small.width, small.height]).toEqual([300, 200]);
  });

  it("downloads once, skips existing files, and retries then reports failure", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "catalog-img-"));
    const source = await makePng(1200, 1200);
    let calls = 0;
    const ok = async () => {
      calls++;
      return source;
    };
    const first = await ensureImage({ id: "a-00001", imgId: "1" }, dir, ok);
    expect(first.status).toBe("downloaded");
    expect(first.bytes).toBeGreaterThan(0);
    const second = await ensureImage({ id: "a-00001", imgId: "1" }, dir, ok);
    expect(second.status).toBe("exists");
    expect(calls).toBe(1);

    let attempts = 0;
    const failing = async () => {
      attempts++;
      throw new Error("HTTP 404");
    };
    const failed = await ensureImage({ id: "b-00002", imgId: "2" }, dir, failing);
    expect(failed).toMatchObject({ status: "failed", error: "HTTP 404" });
    expect(attempts).toBe(3); // 1 try + 2 retries
    await expect(fs.stat(path.join(dir, "b-00002.webp"))).rejects.toThrow();

    let flaky = 0;
    const recovers = await ensureImage({ id: "c-00003", imgId: "3" }, dir, async () => {
      if (flaky++ === 0) throw new Error("timeout");
      return source;
    });
    expect(recovers.status).toBe("downloaded");
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("rejects the CDN's tiny blank placeholder without retrying", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "catalog-img-"));
    let calls = 0;
    const result = await ensureImage({ id: "p-00004", imgId: "4" }, dir, async () => {
      calls++;
      return Buffer.alloc(722, 1);
    });
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/placeholder/);
    expect(calls).toBe(1);
    await expect(fs.stat(path.join(dir, "p-00004.webp"))).rejects.toThrow();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("limits concurrency and preserves result order", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapConcurrent([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, async (n: number) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
    expect(peak).toBeLessThanOrEqual(4);
  });
});
