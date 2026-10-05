// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  checkOverrides,
  cleanDescriptionText,
  cleanName,
  findLostProtectedIds,
  parseOverrides,
  renameColorImageKeys,
  titleCaseColor,
  buildCatalog,
  buildDescription,
  cleanColors,
  cleanRow,
  cleanTiers,
  compareCandidates,
  detectBrand,
  isDuplicateName,
  makeUniqueId,
  normalizeName,
  significantTokens,
  slugify,
  stripBadge,
  toPublicRecord,
  vendorScore,
  MIN_VENDOR_RATING,
  MIN_VENDOR_REVIEWS,
} from "../scripts/lib/catalogClean.mjs";
import { compressImage, ensureImage, mapConcurrent } from "../scripts/lib/catalogImages.mjs";
import { readCuratedProducts, removeOrphanImages } from "../scripts/importCatalog.mjs";
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

  it("drops apostrophes instead of splitting words", () => {
    expect(slugify("Men's Polo \u2019Classic\u2019")).toBe("mens-polo-classic");
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
      4.8,
      50,
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

  it("does not repeat Made in USA when the supplier text already says it", () => {
    expect(
      buildDescription({
        rawDescription: "Golf balls. Made in USA.",
        colorCount: 1,
        sizes: "",
        minQty: 6,
        usa: 1,
        multiGrid: 0,
      })
    ).toBe("Golf balls. Made in USA. Priced at 6 units.");
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
      "low-vendor-rating": 2,
      "excluded-supplier": 1,
      "duplicate-other-vendor": 1, // same espId listed by another vendor
      "duplicate-same-vendor": 1, // same supplier + product number
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
    expect(collisions[1].id).toBe("fixture-collision-item-00012345");
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
      { quantity: 1, price: 10.5 },
      { quantity: 50, price: 7.7 },
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
        expect(tier.quantity).toBe(r.tiers[i][0]);
        expect(tier).not.toHaveProperty("espPrice");
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

// ---- vendor gate, vendor score, duplicate clusters --------------------------

interface RowOpts {
  espId: string;
  name: string;
  tag?: string;
  rating?: number;
  reviews?: number;
  asi?: string;
  supplier?: string;
  productNo?: string;
  colors?: string[];
  price?: number;
}

/** Build a raw positional row with sensible defaults (good vendor, valid image id). */
function mk(o: RowOpts): unknown[] {
  return [
    o.espId,
    o.productNo ?? `PN-${o.espId}`,
    o.name,
    "",
    o.colors ?? ["Black"],
    "",
    [[1, o.price ?? 10]],
    "12345",
    o.supplier ?? `Vendor ${o.asi ?? "asi/1"}`,
    o.asi ?? "asi/1",
    o.rating ?? 4.8,
    o.reviews ?? 100,
    0,
    o.tag ?? "drinkware",
    0,
  ];
}

describe("vendor quality gate", () => {
  it("keeps the thresholds as named constants", () => {
    expect(MIN_VENDOR_RATING).toBe(4.5);
    expect(MIN_VENDOR_REVIEWS).toBe(10);
  });

  it("requires rating >= 4.5 AND reviews >= 10", () => {
    expect(cleanRow(mk({ espId: "1", name: "A", rating: 4.5, reviews: 10 })).skip).toBeUndefined();
    expect(cleanRow(mk({ espId: "1", name: "A", rating: 4.49, reviews: 500 })).skip).toBe(
      "low-vendor-rating"
    );
    expect(cleanRow(mk({ espId: "1", name: "A", rating: 5, reviews: 9 })).skip).toBe(
      "low-vendor-rating"
    );
    const missing = mk({ espId: "1", name: "A" });
    missing[10] = undefined;
    expect(cleanRow(missing).skip).toBe("low-vendor-rating");
  });

  it("always excludes supplier asi/38120 (Ball Pro), however well rated", () => {
    expect(
      cleanRow(mk({ espId: "1", name: "A", asi: "asi/38120", rating: 5, reviews: 999 })).skip
    ).toBe("excluded-supplier");
  });

  it("runs before every other check", () => {
    const bad = mk({ espId: "", name: "", tag: "nope", rating: 3, reviews: 1 });
    expect(cleanRow(bad).skip).toBe("low-vendor-rating");
    const excluded = mk({ espId: "", name: "", tag: "nope", asi: "asi/38120" });
    expect(cleanRow(excluded).skip).toBe("excluded-supplier");
  });
});

describe("vendor score and ranking", () => {
  it("is the bayesian average toward 4.0 with weight 10", () => {
    expect(vendorScore(5, 10)).toBeCloseTo((5 * 10 + 4 * 10) / 20, 10);
    expect(vendorScore(4.5, 90)).toBeCloseTo((4.5 * 90 + 40) / 100, 10);
    // a perfect rating on few reviews loses to a slightly lower one on many
    expect(vendorScore(5, 10)).toBeLessThan(vendorScore(4.8, 400));
  });

  it("breaks ties by reviews, then colors, then first-tier price, then espId", () => {
    const base = (over: object) => ({
      espId: "100",
      vendor: { rating: 4.8, reviews: 100 },
      product: { colors: ["a"], tiers: [[1, 10]] },
      ...over,
    });
    // equal score (same rating+reviews): colors decide
    expect(
      compareCandidates(
        base({ product: { colors: ["a", "b"], tiers: [[1, 10]] } }) as never,
        base({}) as never
      )
    ).toBeLessThan(0);
    // then lower price
    expect(
      compareCandidates(
        base({ product: { colors: ["a"], tiers: [[1, 9]] } }) as never,
        base({}) as never
      )
    ).toBeLessThan(0);
    // then smaller espId
    expect(compareCandidates(base({ espId: "099" }) as never, base({}) as never)).toBeLessThan(0);
    expect(compareCandidates(base({}) as never, base({}) as never)).toBe(0);
  });
});

describe("duplicate detection", () => {
  it("does not merge a single item with a bundled set (verified Jaccard < 0.75)", () => {
    expect(isDuplicateName("Pickleball Paddle", "Pickleball Paddle Set with balls and bag")).toBe(
      false
    );
  });

  it("keeps different sizes separate", () => {
    expect(isDuplicateName("30 oz Tumbler", "20 oz Tumbler")).toBe(false);
    expect(isDuplicateName("Stainless Steel Tumbler 30 oz", "Stainless Steel Tumbler 20 oz")).toBe(
      false
    );
  });

  it("keeps gender / sleeve-length variants separate even in long names", () => {
    expect(
      isDuplicateName(
        "Port Authority Short Sleeve Easy Care Shirt",
        "Port Authority Long Sleeve Easy Care Shirt"
      )
    ).toBe(false);
    expect(
      isDuplicateName(
        "Brand Dri Fit Moisture Wicking Performance Polo Shirt Mens",
        "Brand Dri Fit Moisture Wicking Performance Polo Shirt Womens"
      )
    ).toBe(false);
  });

  it("merges the same item despite filler, plurals, units spacing and trademark marks", () => {
    expect(
      isDuplicateName("Custom Logo 16oz Stainless Steel Tumblers", "16 oz. Stainless Steel Tumbler")
    ).toBe(true);
    expect(isDuplicateName("Men's Polo Shirt, Classic Fit", "Mens Polo Shirts Classic Fit")).toBe(
      true
    );
    expect(isDuplicateName("Nike® Dri-FIT™ Polo", "NIKE Dri FIT Polo")).toBe(true);
    expect(isDuplicateName("Premium Quality Mug", "Mug")).toBe(true);
  });

  it("tokenizes: drops filler, keeps numbers and units, stems plurals", () => {
    expect([...significantTokens("The New Custom 20 oz. Water Bottles w/ Lid")].sort()).toEqual([
      "20",
      "bottle",
      "lid",
      "oz",
      "water",
    ]);
  });
});

describe("one row kept per duplicate cluster", () => {
  const NAME = "Stainless Steel Insulated Tumbler 20 oz";

  it("keeps the best-scoring vendor's row across vendors", () => {
    const rows = [
      mk({ espId: "1001", name: NAME, asi: "asi/1", rating: 4.6, reviews: 20, price: 5 }),
      mk({ espId: "1002", name: NAME, asi: "asi/2", rating: 4.9, reviews: 300, price: 9 }),
      mk({ espId: "1003", name: NAME + " Custom", asi: "asi/3", rating: 5, reviews: 10 }),
    ];
    const { items, clusters, skipped } = buildCatalog(rows);
    expect(items).toHaveLength(1);
    expect(items[0].link.espId).toBe("1002");
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kept.espId).toBe("1002");
    expect(clusters[0].dropped.map((d) => d.reason)).toEqual([
      "duplicate-other-vendor",
      "duplicate-other-vendor",
    ]);
    expect(skipped["duplicate-other-vendor"]).toBe(2);
  });

  it("within one vendor prefers more colors, then the lower first-tier price", () => {
    const rows = [
      mk({ espId: "2001", name: NAME, colors: ["a"], price: 3 }),
      mk({ espId: "2002", name: NAME, colors: ["a", "b", "c"], price: 8 }),
      mk({ espId: "2003", name: NAME, colors: ["a", "b", "c"], price: 7 }),
    ];
    const { items, skipped } = buildCatalog(rows);
    expect(items.map((i) => i.link.espId)).toEqual(["2003"]);
    expect(skipped["duplicate-same-vendor"]).toBe(2);
  });

  it("merges via same espId or same supplier+productNo even with different names", () => {
    const rows = [
      mk({ espId: "3001", name: "Alpha Widget", productNo: "X1", supplier: "Co", asi: "asi/5" }),
      mk({
        espId: "3002",
        name: "Totally Different Name",
        productNo: "x1",
        supplier: "co",
        asi: "asi/5",
      }),
      mk({ espId: "3003", name: "Another Thing Entirely", tag: "bags" }),
      mk({ espId: "3003", name: "Another Thing Entirely Again", tag: "gifts" }),
    ];
    expect(buildCatalog(rows).items).toHaveLength(2);
  });

  it("never keeps two rows from one cluster, and keeps separate products separate", () => {
    const rows = [
      mk({ espId: "4001", name: "Pickleball Paddle" }),
      mk({ espId: "4002", name: "Pickleball Paddle Set with balls and bag" }),
      mk({ espId: "4003", name: "30 oz Tumbler" }),
      mk({ espId: "4004", name: "20 oz Tumbler" }),
      mk({ espId: "4005", name: "30 oz Tumbler", asi: "asi/9" }),
    ];
    const { items, clusters } = buildCatalog(rows);
    expect(items).toHaveLength(4);
    expect(clusters).toHaveLength(1);
    const kept = new Set(clusters.flatMap((c) => [c.kept, ...c.dropped]).map((m) => m.espId));
    expect(kept).toEqual(new Set(["4003", "4005"]));
  });

  it("does not compare across categories", () => {
    const rows = [
      mk({ espId: "5001", name: "Classic Logo Cap", tag: "headwear" }),
      mk({ espId: "5002", name: "Classic Logo Cap", tag: "apparel" }),
    ];
    expect(buildCatalog(rows).items).toHaveLength(2);
  });

  it("is order independent: same rows kept whatever the input order", () => {
    const rows = [
      mk({ espId: "6001", name: NAME, asi: "asi/1", rating: 4.6, reviews: 20 }),
      mk({ espId: "6002", name: NAME, asi: "asi/2", rating: 4.9, reviews: 300 }),
      mk({ espId: "6003", name: "Something Else Entirely" }),
    ];
    const keep = (r: unknown[]) =>
      buildCatalog(r)
        .items.map((i) => i.link.espId)
        .sort();
    expect(keep(rows)).toEqual(keep([...rows].reverse()));
  });

  it("falls back to the runner-up when the winner's image is rejected", () => {
    const rows = [
      mk({ espId: "7001", name: NAME, asi: "asi/1", rating: 4.6, reviews: 20 }),
      mk({ espId: "7002", name: NAME, asi: "asi/2", rating: 4.9, reviews: 300 }),
    ];
    const { items, skipped } = buildCatalog(rows, { rejectedEspIds: ["7002"] });
    expect(items.map((i) => i.link.espId)).toEqual(["7001"]);
    expect(skipped["image-failed"]).toBe(1);
  });

  it("curated always wins, but only within the same category (or an exact name)", () => {
    const curated = [
      { id: "cur-tumbler", name: "Stainless Steel Insulated Tumbler 20 oz", category: "Drinkware" },
    ];
    const near = mk({ espId: "8001", name: "20 oz Stainless Steel Insulated Tumblers" });
    const otherCat = mk({
      espId: "8002",
      name: "20 oz Stainless Steel Insulated Tumblers",
      tag: "gifts",
    });
    const result = buildCatalog([near, otherCat], { curated });
    expect(result.skipped["duplicate-of-curated"]).toBe(1);
    expect(result.items.map((i) => i.link.espId)).toEqual(["8002"]);
    expect(result.curatedDuplicates[0].curated).toBe(curated[0].name);
    // curated ids are never reused
    expect(result.items[0].id).not.toBe("cur-tumbler");
  });
});

describe("orphan image cleanup", () => {
  it("deletes only previously generated images that are no longer selected", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "catalog-orphans-"));
    const touch = (name: string) => fs.writeFile(path.join(dir, name), "x");
    await touch("old-item-11111.webp"); // generated earlier, no longer selected
    await touch("kept-item-22222.webp"); // generated earlier, still selected
    await touch("peter-millar-curated.webp"); // curated asset: never in the manifest
    await touch("notes.txt");
    const removed = await removeOrphanImages({
      imagesDir: dir,
      previousIds: ["old-item-11111", "kept-item-22222", "already-gone-33333", "../evil"],
      selectedIds: ["kept-item-22222", "new-item-44444"],
    });
    expect(removed).toEqual(["old-item-11111"]);
    expect((await fs.readdir(dir)).sort()).toEqual([
      "kept-item-22222.webp",
      "notes.txt",
      "peter-millar-curated.webp",
    ]);
    await fs.rm(dir, { recursive: true, force: true });
  });
});

// ---- promo / vendor noise cleanup --------------------------------------------

describe("name cleanup", () => {
  it("strips promo phrases and stray punctuation", () => {
    expect(cleanName("ON SALE! Professional Golf Ball")).toBe("Professional Golf Ball");
    expect(cleanName("Port Authority Team Jacket.")).toBe("Port Authority Team Jacket");
    expect(cleanName("Mug 20% off")).toBe("Mug");
    expect(cleanName("Golf Ball - Free Shipping!!")).toBe("Golf Ball");
    expect(cleanName("Tumbler (Limited Time)")).toBe("Tumbler");
    expect(cleanName("Fixed Amount Discount Pen")).toBe("Pen");
    expect(cleanName("Umbrella - Sale!")).toBe("Umbrella");
    expect(cleanName("  ..Hoodie,,  ")).toBe("Hoodie");
    expect(cleanName("Tote   Bag!!")).toBe("Tote Bag");
  });

  it("keeps trademark marks and legitimate uses of the word sale", () => {
    expect(cleanName("Titleist Pro V1® ")).toBe("Titleist Pro V1®");
    expect(cleanName("Bella+Canvas Tee™")).toBe("Bella+Canvas Tee™");
    expect(cleanName("Yard Sale Sign Holder")).toBe("Yard Sale Sign Holder");
    expect(cleanName("Point of Sale Counter Mat")).toBe("Point of Sale Counter Mat");
  });

  it("an all-promo name becomes empty so the row is skipped", () => {
    const row = mk({ espId: "9001", name: "ON SALE!" });
    expect(cleanRow(row).skip).toBe("empty-name");
  });
});

describe("description cleanup", () => {
  it("drops promo sentences and promo labels glued to the front, keeping real text", () => {
    expect(cleanDescriptionText("Free shipping on orders over $100. Nice tote.")).toBe(
      "Nice tote."
    );
    expect(cleanDescriptionText("Fixed Amount Discount DC Premium cotton twill cap.")).toBe(
      "DC Premium cotton twill cap."
    );
    expect(cleanDescriptionText("Sale! Lightweight cap.")).toBe("Lightweight cap.");
    expect(cleanDescriptionText("Soft tee. Click here to order. Great fit.")).toBe(
      "Soft tee. Great fit."
    );
    expect(cleanDescriptionText("Perfect for yard sale signs.")).toBe(
      "Perfect for yard sale signs."
    );
  });

  it("drops vendor color-count claims without inventing text", () => {
    expect(
      cleanDescriptionText("Available in 30 attractive colors - solid and alternating panels.")
    ).toBe("Solid and alternating panels.");
    expect(
      cleanDescriptionText(
        "100% acrylic beanie with a classic rolled cuff design and eight available colors."
      )
    ).toBe("100% acrylic beanie with a classic rolled cuff design.");
    expect(cleanDescriptionText("Tote in 3 sizes and 5 colors.")).toBe("Tote in 3 sizes.");
    expect(cleanDescriptionText("Soft tee. Eight colors available. Great fit.")).toBe(
      "Soft tee. Great fit."
    );
    expect(cleanDescriptionText("Comes in eight colors.")).toBe("");
  });

  it("leaves imprint-color facts and decimals alone", () => {
    expect(cleanDescriptionText("Includes a 2-color imprint. Made of 3.4 oz cotton.")).toBe(
      "Includes a 2-color imprint. Made of 3.4 oz cotton."
    );
  });

  it("falls back to the '<n> color options.' pattern when nothing is left", () => {
    expect(
      buildDescription({
        rawDescription: "Trending Comes in eight colors.",
        colorCount: 8,
        sizes: "",
        minQty: 12,
        usa: 0,
        multiGrid: 0,
      })
    ).toBe("8 color options. Priced at 12 units.");
  });

  it("never leaves a color-count claim that disagrees with the real color list", () => {
    const row = mk({
      espId: "9100",
      name: "Cap",
      colors: ["A", "B"],
    });
    row[3] = "Cotton cap in 12 colors.";
    const cleaned = cleanRow(row);
    expect(cleaned.product?.description).toBe("Cotton cap. Priced at 1 unit.");
  });
});

describe("color name cleanup", () => {
  it("title-cases shouted colors but keeps acronyms, codes and anything with digits", () => {
    expect(titleCaseColor("BLACK")).toBe("Black");
    expect(titleCaseColor("NAVY BLUE")).toBe("Navy Blue");
    expect(titleCaseColor("BLACK/WHITE")).toBe("Black/White");
    expect(titleCaseColor("UPF 50 WHITE")).toBe("UPF 50 WHITE");
    expect(titleCaseColor("PMS 123")).toBe("PMS 123");
    expect(titleCaseColor("UPF")).toBe("UPF");
    expect(titleCaseColor("Black Heather - 104")).toBe("Black Heather - 104");
    expect(titleCaseColor("Royal BLUE")).toBe("Royal BLUE"); // mixed case: as supplied
  });

  it("dedupes after case conversion", () => {
    expect(cleanColors(["BLACK", "Black", "NAVY BLUE", "Red Show less"])).toEqual([
      "Black",
      "Navy Blue",
      "Red",
    ]);
  });
});

// ---- manual overrides ----------------------------------------------------------

describe("manual overrides", () => {
  it("drops the listed espId (after the vendor gate) and reports it", () => {
    const rows = [
      mk({
        espId: "100",
        name: "Titleist Pro V1 Golf Ball",
        asi: "asi/1",
        rating: 4.5,
        reviews: 50,
      }),
      mk({ espId: "200", name: "Titleist Pro V1", asi: "asi/2", rating: 5, reviews: 11 }),
      mk({ espId: "300", name: "Gated Thing", rating: 3, reviews: 1 }),
    ];
    const result = buildCatalog(rows, {
      dropEspIds: [
        { espId: "100", reason: "same ball as 200" },
        { espId: "300", reason: "would be gated first" },
      ],
    });
    expect(result.items.map((i) => i.link.espId)).toEqual(["200"]);
    expect(result.skipped["manual-override"]).toBe(1);
    expect(result.skipped["low-vendor-rating"]).toBe(1); // the gate wins, override never reached
    expect(result.manualOverrides).toHaveLength(1);
    expect(result.manualOverrides[0].reason).toBe("same ball as 200");
  });

  it("validates the overrides file shape", () => {
    expect(parseOverrides({ dropEspIds: [{ espId: " 1 ", reason: "r", keepEspId: "2" }] })).toEqual(
      [{ espId: "1", reason: "r", keepEspId: "2" }]
    );
    expect(() => parseOverrides({ dropEspIds: [{ espId: "1" }] })).toThrow(/reason/);
    expect(() => parseOverrides({ dropEspIds: [{ reason: "x" }] })).toThrow(/espId/);
    expect(() =>
      parseOverrides({
        dropEspIds: [
          { espId: "1", reason: "a" },
          { espId: "1", reason: "b" },
        ],
      })
    ).toThrow(/duplicate/);
    expect(parseOverrides({})).toEqual([]);
  });

  it("warns on a stale override, a missing replacement, or no replacement named", () => {
    const base = { rawEspIds: ["1", "2"], selectedEspIds: ["2"], curatedIds: ["cur"] };
    expect(
      checkOverrides({ ...base, overrides: [{ espId: "1", reason: "r", keepEspId: "2" }] })
    ).toEqual([]);
    expect(
      checkOverrides({ ...base, overrides: [{ espId: "9", reason: "r", keepEspId: "2" }] })[0]
    ).toMatch(/stale override: espId 9/);
    expect(
      checkOverrides({ ...base, overrides: [{ espId: "1", reason: "r", keepEspId: "7" }] })[0]
    ).toMatch(/replacement espId 7 is NOT in the imported catalog/);
    expect(
      checkOverrides({
        ...base,
        overrides: [{ espId: "1", reason: "r", keepCuratedId: "nope" }],
      })[0]
    ).toMatch(/curated product nope does not exist/);
    expect(checkOverrides({ ...base, overrides: [{ espId: "1", reason: "r" }] })[0]).toMatch(
      /names no replacement/
    );
  });

  it("ships overrides for the two known duplicates, both still live in the raw data", async () => {
    const file = JSON.parse(
      await fs.readFile(path.join(__dirname, "../scripts/data/import-overrides.json"), "utf8")
    );
    const overrides = parseOverrides(file);
    expect(overrides.map((o) => o.espId)).toEqual(["7273365", "552519118"]);
    expect(overrides[0].keepEspId).toBe("556464384");
    expect(overrides[1].keepCuratedId).toBe("6panel-premium-relaxed-golf-cap");
    const shippedIds = new Set(products.map((p) => p.id));
    expect(shippedIds.has("6panel-premium-relaxed-golf-cap")).toBe(true);
  });
});

describe("protected ids and color photo keys", () => {
  it("reports only protected ids that were selected before and are gone now", () => {
    expect(
      findLostProtectedIds({
        previousIds: ["a", "b", "c"],
        selectedIds: ["a", "c"],
        protectedIds: ["b", "c", "zzz"],
      })
    ).toEqual(["b"]);
    expect(
      findLostProtectedIds({ previousIds: ["a"], selectedIds: ["a"], protectedIds: ["a"] })
    ).toEqual([]);
  });

  it("renames color photo keys changed by cleanup and never touches the paths", () => {
    const input = {
      cap: { BLACK: "/p/black.webp", "Navy Blue": "/p/navy.webp", "NAVY BLUE": "/p/x.webp" },
      curated: { WHATEVER: "/p/c.webp" },
      hat: { "ROYAL BLUE": "/p/royal.webp" },
    };
    const result = renameColorImageKeys(input, [
      { id: "cap", colors: ["Black", "Navy Blue"] },
      { id: "hat", colors: ["Royal Blue"] },
    ]);
    expect(result.colorImages.hat).toEqual({ "Royal Blue": "/p/royal.webp" });
    expect(result.colorImages.cap.Black).toBe("/p/black.webp");
    expect(result.colorImages.curated).toEqual({ WHATEVER: "/p/c.webp" }); // not imported: untouched
    expect(result.renamed).toBe(2);
    // a key that would collide with an existing one is reported, not clobbered
    expect(result.unresolved).toEqual(['cap: "NAVY BLUE"']);
    expect(result.colorImages.cap["Navy Blue"]).toBe("/p/navy.webp");
  });
});
