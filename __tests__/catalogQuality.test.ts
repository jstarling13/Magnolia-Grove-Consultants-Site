// @vitest-environment node
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nearDuplicateRows from "./fixtures/catalogNearDuplicates.fixture.json";
import {
  NEAR_DUPLICATE_JACCARD,
  PRICE_NOTE_SIZE,
  buildCatalog,
  buildDescription,
  cleanRow,
  improveGenericName,
  isNearDuplicate,
  isShoutyName,
  isSizePriced,
  nameShowsSizes,
  normalizeNameCase,
  parseKeepApart,
  parseNameOverrides,
  parseOverrides,
  parseSizeOptions,
  primarySizeLabel,
  significantTokens,
  sizesConflict,
  toPublicRecord,
} from "../scripts/lib/catalogClean.mjs";
import { toCardProduct, toCartProduct, toCatalogProduct } from "../src/lib/merchCatalog";
import { isImportedProductRecord, toImportedProduct } from "../src/config/merchandiseConfig";

/**
 * Catalog quality rules in the importer: name casing and generic names, size-priced
 * products (priceNote), thin descriptions, and the looser cross-supplier near-duplicate rule.
 * Near-duplicate cases use real raw rows (fixtures/catalogNearDuplicates.fixture.json).
 */

const overridesFile = JSON.parse(
  await fs.readFile(path.join(__dirname, "../scripts/data/import-overrides.json"), "utf8")
);

/** Minimal raw row: [espId, productNo, name, desc, colors, sizes, tiers, imgId, supplier, asi, rating, reviews, usa, tag, multiGrid]. */
function row(o: {
  espId: string;
  name: string;
  desc?: string;
  colors?: string[];
  sizes?: string;
  tiers?: [number, number][];
  supplier?: string;
  rating?: number;
  reviews?: number;
  tag?: string;
  multiGrid?: number;
}): unknown[] {
  return [
    o.espId,
    `PN-${o.espId}`,
    o.name,
    o.desc ?? "",
    o.colors ?? ["Black"],
    o.sizes ?? "",
    o.tiers ?? [[1, 10]],
    "12345",
    o.supplier ?? "Vendor One",
    `asi/${o.supplier ?? "one"}`,
    o.rating ?? 5,
    o.reviews ?? 100,
    0,
    o.tag ?? "home",
    o.multiGrid ?? 0,
  ];
}

describe("name casing", () => {
  it("flags names set mostly in capitals (over 70% of letters)", () => {
    expect(isShoutyName("LANYARDS DYE SUBLIMATED FULL COLOR")).toBe(true);
    expect(isShoutyName("GERBER® COMPLEAT CUTTING BOARD SET")).toBe(true);
    expect(isShoutyName("PERRY ELLIS® Mini Grid Woven Women's Dress Shirt")).toBe(false);
    expect(isShoutyName("RTIC 20oz Essential Tumbler")).toBe(false);
    expect(isShoutyName("USB")).toBe(false); // too short to be shouting
  });

  it("converts shouted names to Title Case, keeping acronyms, marks and units", () => {
    expect(normalizeNameCase("LANYARDS DYE SUBLIMATED FULL COLOR")).toBe(
      "Lanyards Dye Sublimated Full Color"
    );
    expect(normalizeNameCase("GERBER® COMPLEAT CUTTING BOARD SET")).toBe(
      "Gerber® Compleat Cutting Board Set"
    );
    expect(normalizeNameCase("CEDAR CREEK® 25 FOOT TAPE MEASURE")).toBe(
      "Cedar Creek® 25 Foot Tape Measure"
    );
    expect(normalizeNameCase("LED FLASHLIGHT WITH USB CHARGING FOR MEN'S KITS")).toBe(
      "LED Flashlight with USB Charging for Men's Kits"
    );
    expect(normalizeNameCase("16 OZ ANTI-SLIP MUG")).toBe("16 oz Anti-Slip Mug");
  });

  it("only capitalizes fully lower-case words in other names, never mixed-case ones", () => {
    expect(normalizeNameCase("Golf visor")).toBe("Golf Visor");
    expect(normalizeNameCase("Carpet household outdoor non-slip mat")).toBe(
      "Carpet Household Outdoor Non-Slip Mat"
    );
    expect(normalizeNameCase("rPET Roll-Up Picnic Blanket")).toBe("rPET Roll-Up Picnic Blanket");
    expect(normalizeNameCase("TiTUS® Executive Notebook with Pen")).toBe(
      "TiTUS® Executive Notebook with Pen"
    );
    expect(normalizeNameCase("5000mAh Power bank w/ cable")).toBe("5000mAh Power Bank w/ Cable");
    expect(normalizeNameCase('2.75" W x 15" H Bumper Sticker')).toBe(
      '2.75" W x 15" H Bumper Sticker'
    );
  });

  it("normalizes a shouted raw name in the importer without changing the product id", () => {
    const shouty = row({ espId: "9000012345", name: "SUMMIT 24 CAN COOLER BACKPACK", tag: "bags" });
    const plain = row({ espId: "9000012345", name: "Summit 24 Can Cooler Backpack", tag: "bags" });
    const a = buildCatalog([shouty]).items[0];
    const b = buildCatalog([plain]).items[0];
    expect(a.product.name).toBe("Summit 24 Can Cooler Backpack");
    expect(a.product.imageAlt).toBe("Summit 24 Can Cooler Backpack");
    // the id slug comes from the original (lower-cased) name, so it is identical either way
    expect(a.id).toBe("summit-24-can-cooler-backpack-12345");
    expect(a.id).toBe(b.id);
  });
});

describe("generic names", () => {
  it("adds the one clean size to short size-sensitive names", () => {
    expect(improveGenericName("Door Mat", `15 " x 23 "`)).toBe(`Door Mat, 15" x 23"`);
    expect(improveGenericName("Coir Doormat", `15 3/4 " x 23 5/8 " x 9/16 "`)).toBe(
      `Coir Doormat, 15 3/4" x 23 5/8"`
    );
    expect(improveGenericName("Door Hanger", `3 1/2 " x 8 1/2 "`)).toBe(
      `Door Hanger, 3 1/2" x 8 1/2"`
    );
  });

  it("leaves names alone when the size is ambiguous, already present, or not a real width x height", () => {
    expect(improveGenericName("Door Mat", "")).toBe("Door Mat");
    expect(improveGenericName("Floor Impressions Mats", `2 ' x 3 ', 3 ' x 5 ', 4 ' x 6 '`)).toBe(
      "Floor Impressions Mats"
    );
    expect(improveGenericName("3' x 5' Indoor Entrance Mat", `3 ' x 5 '`)).toBe(
      "3' x 5' Indoor Entrance Mat"
    );
    // thickness listed first is not a width
    expect(improveGenericName("Luxury Beach Towel", `0.25 " x 60 " x 35 "`)).toBe(
      "Luxury Beach Towel"
    );
    // long descriptive names are specific enough
    expect(improveGenericName("Custom Outdoor Front Door Mat", `23.62 " x 35.43 "`)).toBe(
      "Custom Outdoor Front Door Mat"
    );
    // not a size-sensitive item
    expect(improveGenericName("Stress Ball", `2.75 " x 2.75 "`)).toBe("Stress Ball");
    expect(primarySizeLabel("500 mm x 800 mm")).toBe("");
  });

  it("applies the rule inside the importer and reports the rename", () => {
    const result = buildCatalog([
      row({ espId: "7000011111", name: "Door Mat", sizes: `15 " x 23 "` }),
    ]);
    expect(result.items[0].product.name).toBe(`Door Mat, 15" x 23"`);
    expect(result.items[0].product.imageAlt).toBe(`Door Mat, 15" x 23"`);
    expect(result.renamed).toHaveLength(1);
    // the id still comes from the original name
    expect(result.items[0].id).toBe("door-mat-11111");
  });

  it("applies a per-espId name override, never changing the id, and recomputes the brand", () => {
    const overrides = parseNameOverrides({
      nameOverrides: [
        { espId: "7000022222", name: "Textured Non-Skid Rug", reason: "description says so" },
      ],
    });
    const rows = [row({ espId: "7000022222", name: "Rugs", desc: "Textured Non-Skid Rug" })];
    const plain = buildCatalog(rows).items[0];
    const renamed = buildCatalog(rows, { nameOverrides: overrides }).items[0];
    expect(renamed.product.name).toBe("Textured Non-Skid Rug");
    expect(renamed.id).toBe(plain.id);
    expect(renamed.id).toBe("rugs-22222");
  });

  it("reports a name collision the rules cannot resolve instead of hiding it", () => {
    // "Door Mat" is renamed to include its size, which another product already uses verbatim
    const result = buildCatalog([
      row({ espId: "7000033331", name: "Door Mat", sizes: `15 " x 23 "`, supplier: "A" }),
      row({ espId: "7000033332", name: `Door Mat, 15" x 23"`, supplier: "B" }),
    ]);
    expect(result.items).toHaveLength(2);
    expect(result.nameCollisions).toEqual([
      { espId: "7000033332", name: `Door Mat, 15" x 23"`, sameAs: "7000033331" },
    ]);
  });

  it("validates nameOverrides entries", () => {
    expect(() => parseNameOverrides({ nameOverrides: [{ espId: "1", name: "X" }] })).toThrow(
      /no reason/
    );
    expect(() =>
      parseNameOverrides({ nameOverrides: [{ espId: "1", name: "LOUD NAME", reason: "r" }] })
    ).toThrow(/all caps/);
    expect(() =>
      parseNameOverrides({
        nameOverrides: [
          { espId: "1", name: "A name", reason: "r" },
          { espId: "1", name: "Another name", reason: "r" },
        ],
      })
    ).toThrow(/duplicate/);
  });

  it("ships name overrides that are tidy, unique, and reasoned", () => {
    const overrides = parseNameOverrides(overridesFile);
    expect(overrides.length).toBeGreaterThan(5);
    const names = overrides.map((o) => o.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const o of overrides) {
      expect(o.name).toBe(normalizeNameCase(o.name));
      expect(o.reason.length).toBeGreaterThan(20);
      // no emoji or pictographs
      expect(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF]/u.test(o.name)).toBe(false);
    }
  });
});

describe("size-priced products (priceNote)", () => {
  it("reads physical size options, not apparel letters or capacities", () => {
    expect(parseSizeOptions(`10 ' x 10 ', 10 ' x 20 ', 20 ' x 20 '`)).toHaveLength(3);
    expect(parseSizeOptions(`48 " x 30 ", 60 " x 48 ", 96 " x 60 "`)).toHaveLength(3);
    expect(parseSizeOptions("6 ', 8 ', 10 '")).toHaveLength(3);
    expect(parseSizeOptions("7 in, 8 in, 10 in")).toHaveLength(3);
    expect(parseSizeOptions(`31.5 " x 51 "`)).toHaveLength(1);
    expect(parseSizeOptions("XS, S, M, L, XL")).toEqual([]);
    expect(parseSizeOptions("2 GB, 4 GB, 8 GB")).toEqual([]);
    expect(parseSizeOptions("")).toEqual([]);
  });

  it("recognizes sizes listed in the name", () => {
    expect(nameShowsSizes("8X8 and 8X10 Adjustable Fabric Backdrop")).toBe(true);
    expect(nameShowsSizes(`24" x 18" - 36" x 48" Real Estate Signs Post Kit`)).toBe(true);
    expect(nameShowsSizes("Custom Inflatable Bottle (6' 8' 10' 15' 20')")).toBe(true);
    expect(nameShowsSizes("New Custom Temporary Tattoos - All Sizes")).toBe(true);
    expect(nameShowsSizes(`3' x 5' Indoor Entrance Mat`)).toBe(false);
    expect(nameShowsSizes("Bath Mat")).toBe(false);
  });

  it("needs the supplier's multi-grid flag AND several sizes", () => {
    const sizes = `2 ' x 3 ', 3 ' x 5 ', 4 ' x 6 '`;
    expect(isSizePriced({ multiGrid: 1, sizes, name: "Floor Mats" })).toBe(true);
    expect(isSizePriced({ multiGrid: 0, sizes, name: "Floor Mats" })).toBe(false);
    // one size: the multi-grid flag is about options, not sizes
    expect(isSizePriced({ multiGrid: 1, sizes: `31.5 " x 51 "`, name: "Rugs" })).toBe(false);
    expect(isSizePriced({ multiGrid: 1, sizes: "XS, S, M, L", name: "Polo" })).toBe(false);
    expect(isSizePriced({ multiGrid: 1, sizes: "", name: "8X8 and 8X10 Backdrop" })).toBe(true);
  });

  it("puts the note on the record and replaces the generic caveat in the description", () => {
    const flagged = cleanRow(
      row({
        espId: "7000055555",
        name: "Event Flooring",
        desc: "Premium custom printed floors with plush comfort.",
        sizes: `10 ' x 10 ', 10 ' x 20 '`,
        multiGrid: 1,
      })
    );
    expect(flagged.product?.priceNote).toBe(PRICE_NOTE_SIZE);
    expect(PRICE_NOTE_SIZE).toBe("Priced for the standard size; other sizes quoted on request.");
    expect(flagged.product?.description).not.toMatch(/base size or option/);
    expect(flagged.product?.description).toMatch(/Priced at 1 unit\.$/);
    const record = toPublicRecord({
      id: "event-flooring-55555",
      product: flagged.product!,
    } as never);
    expect(record).toMatchObject({ priceNote: PRICE_NOTE_SIZE });
    expect(isImportedProductRecord(record)).toBe(true);

    // single size + multi-grid flag: no note, the original sentence stays
    const single = cleanRow(
      row({
        espId: "7000066666",
        name: "Rugs",
        desc: "A rug.",
        sizes: `31.5 " x 51 "`,
        multiGrid: 1,
      })
    );
    expect(single.product?.priceNote).toBeUndefined();
    expect(single.product?.description).toMatch(/base size or option/);
    const plainRecord = toPublicRecord({ id: "rugs-66666", product: single.product! } as never);
    expect("priceNote" in plainRecord).toBe(false);
  });

  it("keeps the generic caveat when buildDescription is not told the product is size-priced", () => {
    const base = { rawDescription: "Great tee", colorCount: 2, sizes: "", minQty: 6, usa: 0 };
    expect(buildDescription({ ...base, multiGrid: 1 })).toMatch(/base size or option/);
    expect(buildDescription({ ...base, multiGrid: 1, sizePriced: true })).toBe(
      "Great tee. Priced at 6 units."
    );
  });

  it("flows from the data file to the product page model but not onto cards or the cart", () => {
    const record = {
      id: "event-flooring-55555",
      name: "Event Flooring",
      category: "Home & Decor",
      brand: "Essentials",
      description: "Printed floors. Priced at 1 unit.",
      tiers: [
        [1, 100],
        [10, 90],
        [50, 80],
      ] as [number, number][],
      image: "/images/merch/event-flooring-55555.webp",
      imageAlt: "Event Flooring",
      priceNote: PRICE_NOTE_SIZE,
    };
    const product = toImportedProduct(record);
    expect(product.priceNote).toBe(PRICE_NOTE_SIZE);
    const area = { top: 50, left: 50, width: 30 };
    const page = toCatalogProduct(product, area);
    expect(page.priceNote).toBe(PRICE_NOTE_SIZE);
    expect(toCardProduct(page).priceNote).toBeUndefined();
    expect("priceNote" in toCartProduct(page)).toBe(false);
    // and an ordinary record carries no key at all
    const { priceNote: _drop, ...ordinary } = record;
    expect("priceNote" in toImportedProduct(ordinary)).toBe(false);
  });
});

describe("thin descriptions", () => {
  it("adds only the size line from the row; the color count and volume break are never written", () => {
    expect(
      buildDescription({
        rawDescription: "Door mat.",
        colorCount: 8,
        sizes: `15 " x 23 "`,
        minQty: 1000,
        usa: 0,
        multiGrid: 0,
        enrich: { name: "Door Mat", breakQty: 2000 },
      })
    ).toBe(`Door mat. Size: 15" x 23". Priced at 1000 units.`);
  });

  it("leaves descriptions that already say enough untouched", () => {
    expect(
      buildDescription({
        rawDescription: "Insulated stainless steel bottle with a flip lid.",
        colorCount: 8,
        sizes: "20 oz",
        minQty: 24,
        usa: 0,
        multiGrid: 0,
        enrich: { name: "Bottle", breakQty: 48 },
      })
    ).toBe("Insulated stainless steel bottle with a flip lid. Priced at 24 units.");
  });

  it("lists a short color list after the name when the row offers no other facts", () => {
    expect(
      buildDescription({
        rawDescription: "",
        sizes: "",
        minQty: 12,
        usa: 0,
        multiGrid: 0,
        enrich: { name: "Titleist TruFeel", colors: ["White", "Yellow"] },
      })
    ).toBe("Titleist TruFeel. Available in White and Yellow. Priced at 12 units.");
    expect(
      buildDescription({
        rawDescription: "",
        sizes: "",
        minQty: 50,
        usa: 0,
        multiGrid: 0,
        enrich: { name: "Polo Shirts", colors: ["A", "B", "C", "D", "E"] },
      })
    ).toBe("Polo Shirts. Priced at 50 units.");
  });

  it("falls back to the product name when the row offers no facts at all", () => {
    expect(
      buildDescription({
        rawDescription: "",
        colorCount: 1,
        sizes: "",
        minQty: 12,
        usa: 0,
        multiGrid: 0,
        enrich: { name: "Titleist TruFeel" },
      })
    ).toBe("Titleist TruFeel. Priced at 12 units.");
  });

  it("does not claim a color count when the supplier text already talks about colors", () => {
    const out = buildDescription({
      rawDescription: "Pen in assorted colors.",
      colorCount: 5,
      sizes: "",
      minQty: 100,
      usa: 0,
      multiGrid: 0,
      enrich: { name: "Pen" },
    });
    expect(out).toBe("Pen in assorted colors. Priced at 100 units.");
  });
});

describe("cross-supplier near-duplicates", () => {
  const rows = nearDuplicateRows as unknown[];
  const apart = parseKeepApart(overridesFile);
  const run = (extra = {}) =>
    buildCatalog(rows, {
      dropEspIds: parseOverrides(overridesFile),
      keepApart: apart,
      nameOverrides: parseNameOverrides(overridesFile),
      ...extra,
    });

  it("collapses each near-duplicate cluster to the best-rated vendor (kept / dropped)", () => {
    const { clusters } = run();
    expect(
      clusters.map((c) => ({
        kept: c.kept.name,
        keptVendor: c.kept.supplier,
        dropped: c.dropped.map((d) => `${d.name} (${d.supplier}, ${d.reason})`),
      }))
    ).toEqual([
      {
        kept: "5 oz Compact Hand Sanitizer Antibacterial Gel",
        keptVendor: "Innovation Line",
        dropped: ["5 oz Hand Sanitizer Gel (NC Custom (CI/Lanco), duplicate-other-vendor)"],
      },
      {
        kept: "Door Hanger",
        keptVendor: "Warwick Publishing Co",
        dropped: ["Door Hanger (Tekweld, duplicate-other-vendor)"],
      },
      {
        kept: "RTIC® Ceramic Lined 20 oz Essential Tumbler",
        keptVendor: "imprintID",
        dropped: ["RTIC 20oz Essential Tumbler (HIRSCH, duplicate-other-vendor)"],
      },
    ]);
  });

  it("drops the World Cup visor in favor of the transparent summer visor via the override", () => {
    const result = run();
    expect(result.manualOverrides.map((m) => m.dropped.name)).toEqual([
      "Transparent PVC Sun Visor Hat W/ Printed World Cup Theme",
    ]);
    const names = result.items.map((i) => i.product.name);
    expect(names).toContain("Transparent Summer Sun Visor");
    expect(names.some((n) => /world cup/i.test(n))).toBe(false);
  });

  it("keeps genuinely different products apart", () => {
    const names = run().items.map((i) => i.product.name);
    // men's vs youth polo (same supplier, age group differs)
    expect(names).toContain("Sublimated Traditional Men's Polo Shirt");
    expect(names).toContain("Sublimated Traditional Youth Polo Shirt");
    // two cotton visors: pre-curved sun visor vs structured golf visor
    expect(names).toContain("Cotton Sun Visor w/ Custom Print");
    expect(names).toContain("Golf Visor");
    // 44" folding umbrella vs 60" golf umbrella
    expect(names).toContain("Steal Umbrella");
    expect(names).toContain("Storm 2 Umbrella");
    // cuff beanie vs pompon beanie
    expect(names).toContain('12" Knit Pompon Beanie');
    expect(names).toContain("12 inch Cuff Beanie");
    // Himalayan tumbler and its recycled full-color version stay (same supplier)
    expect(names).toContain("20 oz. Himalayan Tumbler");
    expect(names).toContain("20 oz. Full Color Himalayan Recycled Tumbler");
    // two door mats with clearly different sizes
    expect(names.filter((n) => /^(Sublimation )?Door Mat/.test(n))).toHaveLength(2);
    // door hanger with a pocket is its own product even though another supplier lists a plain one
    expect(names.filter((n) => n.startsWith("Door Hanger"))).toHaveLength(2);
  });

  it("never merges away a product that carries hand-sourced photos or links", () => {
    // the RTIC rows: the HIRSCH one is protected, so both stay
    const protectedResult = run({ protectedEspIds: ["555615685"] });
    const names = protectedResult.items.map((i) => i.product.name);
    expect(names).toContain("RTIC 20oz Essential Tumbler");
    expect(names).toContain("RTIC® Ceramic Lined 20 oz Essential Tumbler");
    expect(protectedResult.clusters.map((c) => c.kept.name)).not.toContain(
      "RTIC® Ceramic Lined 20 oz Essential Tumbler"
    );
  });

  it("uses a looser threshold only across suppliers, with the usual guards", () => {
    expect(NEAR_DUPLICATE_JACCARD).toBeLessThan(0.75);
    const t = (name: string) => significantTokens(name);
    expect(
      isNearDuplicate(
        t("RTIC 20oz Essential Tumbler"),
        t("RTIC Ceramic Lined 20 oz Essential Tumbler")
      )
    ).toBe(true);
    // a different number, age/gender word, shape or feature word means a different product
    expect(
      isNearDuplicate(
        t("RTIC Ceramic Lined 20 oz Essential Tumbler"),
        t("RTIC Ceramic Lined 30 oz Essential Tumbler")
      )
    ).toBe(false);
    expect(
      isNearDuplicate(
        t("Sublimated Traditional Men's Polo Shirt"),
        t("Sublimated Traditional Youth Polo Shirt")
      )
    ).toBe(false);
    expect(isNearDuplicate(t("Round Stress Ball"), t("Stress Ball"))).toBe(false);
    expect(
      isNearDuplicate(
        t("Multi Charging Cable Universal 3 in 1"),
        t("Multi Retractable 3-in-1 USB Charging Cable")
      )
    ).toBe(false);
    // clearly different sizes
    expect(
      isNearDuplicate(t("Door Mat"), t("Sublimation Door Mat"), `15 " x 23 "`, `19.69 " x 31.5 "`)
    ).toBe(false);
    expect(
      isNearDuplicate(t("Door Mat"), t("Sublimation Door Mat"), `15 " x 23 "`, `23 " x 15 "`)
    ).toBe(true);
  });

  it("compares sizes in inches regardless of order or unit mark", () => {
    expect(sizesConflict(`3 ' x 5 '`, `36 " x 60 "`)).toBe(false);
    expect(sizesConflict(`15 " x 23 "`, `23 " x 15 "`)).toBe(false);
    expect(sizesConflict(`15 " x 23 "`, `19.69 " x 31.5 "`)).toBe(true);
    expect(sizesConflict(`15 " x 23 "`, "20 oz")).toBe(false); // not comparable
    expect(sizesConflict("", `15 " x 23 "`)).toBe(false);
  });
});

import priceNoteOverrides from "@/config/priceNoteOverrides.json";
import { allProducts } from "@/config/merchandiseConfig";

describe("price note overrides", () => {
  it("only name products that exist and show up as the product's price note", () => {
    for (const [id, note] of Object.entries(priceNoteOverrides as Record<string, string>)) {
      const product = allProducts.find((p) => p.id === id);
      expect(product, id).toBeTruthy();
      expect(product?.priceNote, id).toBe(note);
    }
  });
});
