import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import importedProductsJson from "@/config/importedProducts.json";
import {
  MARKUP_RATE,
  clientPrice,
  merchandiseCategories,
  products,
  toImportedProduct,
  type ImportedProductRecord,
} from "@/config/merchandiseConfig";
import type { MerchProduct } from "@/types";

/**
 * Permanent catalog integrity checks over curated + imported products. Every
 * assertion collects offending product ids into one readable message instead of
 * stopping at the first failure.
 */

const importedRecords = importedProductsJson as unknown as ImportedProductRecord[];
const importedIds = new Set(importedRecords.map((r) => r.id));
const publicDir = path.resolve(__dirname, "../public");
const configSource = readFileSync(
  path.resolve(__dirname, "../src/config/merchandiseConfig.ts"),
  "utf8"
);

const PRICED_AT = /\. Priced at (\d+) units?\.$/;
const COLOR_DEBRIS = /show\s+(more|less)/i;
const IMAGE_EXT = /\.(webp|jpe?g|png)$/i;

function violations(check: (p: MerchProduct) => string | null): string[] {
  const out: string[] = [];
  for (const p of products) {
    const problem = check(p);
    if (problem) out.push(`${p.id}: ${problem}`);
  }
  return out;
}

function expectNone(list: string[], rule: string) {
  expect(
    list,
    `${rule} - ${list.length} product(s) violate this:\n  ${list.join("\n  ")}\n`
  ).toEqual([]);
}

/** Raw ESP catalog tiers per curated product id, read from the tiers([...]) literals. */
function curatedRawTiers(): Map<string, [number, number][]> {
  const out = new Map<string, [number, number][]>();
  const blocks = configSource.split(/\n  \{\n    id: "/).slice(1);
  for (const block of blocks) {
    const id = block.slice(0, block.indexOf('"'));
    const m = block.match(/priceTiers: tiers\((\[[\s\S]*?\])\),\s*\n\s*image:/);
    if (!m) continue;
    out.set(id, JSON.parse(m[1].replace(/,(\s*\])/g, "$1")) as [number, number][]);
  }
  return out;
}

describe("catalog integrity", () => {
  it("has a non-trivial catalog", () => {
    expect(products.length).toBeGreaterThan(100);
  });

  it("has unique ids", () => {
    const seen = new Map<string, number>();
    products.forEach((p) => seen.set(p.id, (seen.get(p.id) ?? 0) + 1));
    expectNone(
      [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id}: appears ${n} times`),
      "Product ids must be unique"
    );
  });

  it("has URL-safe ids (lowercase letters, digits, single hyphens)", () => {
    expectNone(
      violations((p) => (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id) ? null : "not a URL-safe slug")),
      "Ids must be URL-safe slugs"
    );
  });

  it("has clean names", () => {
    expectNone(
      violations((p) => {
        if (!p.name.trim()) return "empty name";
        if (p.name.length > 140) return `name is ${p.name.length} chars (max 140)`;
        if (p.name !== p.name.trim()) return "name has leading/trailing whitespace";
        if (/\s{2,}/.test(p.name)) return "name has repeated whitespace";
        return null;
      }),
      "Names must be non-empty, <= 140 chars, with no stray spacing"
    );
  });

  it("has at least one tier, strictly ascending by quantity, with positive prices", () => {
    expectNone(
      violations((p) => {
        if (p.priceTiers.length < 1) return "no price tiers";
        for (let i = 0; i < p.priceTiers.length; i++) {
          const t = p.priceTiers[i];
          if (!Number.isInteger(t.quantity) || t.quantity < 1) return `bad quantity ${t.quantity}`;
          if (!(t.price > 0) || !Number.isFinite(t.price)) return `bad price ${t.price}`;
          if (i > 0 && t.quantity <= p.priceTiers[i - 1].quantity) {
            return `quantities not strictly ascending at tier ${i} (${p.priceTiers[i - 1].quantity} -> ${t.quantity})`;
          }
        }
        return null;
      }),
      "Tiers must be strictly ascending by quantity with positive prices"
    );
  });

  it("never charges more per unit at a higher quantity", () => {
    expectNone(
      violations((p) => {
        for (let i = 1; i < p.priceTiers.length; i++) {
          if (p.priceTiers[i].price > p.priceTiers[i - 1].price) {
            return `price rises ${p.priceTiers[i - 1].price} -> ${p.priceTiers[i].price} at quantity ${p.priceTiers[i].quantity}`;
          }
        }
        return null;
      }),
      "A higher quantity must not cost more per unit"
    );
  });

  it("prices every product at the ESP catalog price plus the markup, rounded to cents", () => {
    expect(MARKUP_RATE).toBe(0.05);
    expect(clientPrice(10)).toBe(10.5);
    expect(clientPrice(7.331)).toBe(7.7);

    const raw = new Map<string, [number, number][]>(curatedRawTiers());
    for (const record of importedRecords) raw.set(record.id, record.tiers);

    const missing = products
      .filter((p) => !raw.has(p.id))
      .map((p) => `${p.id}: no ESP tiers found`);
    expectNone(missing, "Every product's raw ESP tiers must be locatable for the price check");

    expectNone(
      violations((p) => {
        const pairs = raw.get(p.id)!;
        if (pairs.length !== p.priceTiers.length) {
          return `${p.priceTiers.length} tiers but ${pairs.length} ESP pairs`;
        }
        for (let i = 0; i < pairs.length; i++) {
          const expected = Math.round(pairs[i][1] * 1.05 * 100) / 100;
          const tier = p.priceTiers[i];
          if (tier.quantity !== pairs[i][0])
            return `tier ${i} quantity ${tier.quantity} != ${pairs[i][0]}`;
          if (tier.price !== expected) {
            return `tier ${i} price ${tier.price} != round(${pairs[i][1]} * 1.05, 2) = ${expected}`;
          }
          if (Object.keys(tier).sort().join() !== "price,quantity") {
            return `tier ${i} has unexpected keys ${Object.keys(tier).join(",")}`;
          }
        }
        return null;
      }),
      "Customer price must equal round(ESP catalog price * 1.05, 2)"
    );
  });

  it("converts imported records through the same pricing path", () => {
    const sample = importedRecords[0];
    const converted = toImportedProduct(sample);
    expect(converted.priceTiers.map((t) => t.price)).toEqual(
      sample.tiers.map(([, price]) => clientPrice(price))
    );
  });

  it("has a description ending in 'Priced at N units.' that matches the first tier", () => {
    expectNone(
      violations((p) => {
        const d = p.description;
        if (!d.trim()) return "empty description";
        if (d !== d.trim() || /\s{2,}/.test(d)) return "description has stray whitespace";
        const m = d.match(PRICED_AT);
        if (!m) return `does not end with "Priced at N units.": "${d.slice(-50)}"`;
        const n = Number(m[1]);
        const first = p.priceTiers[0]?.quantity;
        if (n !== first) return `says ${n} units but first tier is ${first}`;
        if (n === 1 && !/ Priced at 1 unit\.$/.test(d))
          return 'use "1 unit" (singular) for a minimum of 1';
        if (n !== 1 && !/ units\.$/.test(d)) return `use "${n} units" (plural)`;
        return null;
      }),
      'Descriptions must end with "Priced at N units." matching the smallest tier'
    );
  });

  it("does not claim a color count that disagrees with the colors list", () => {
    expectNone(
      violations((p) => {
        const claim = p.description.match(/\b(\d+)[ -]colou?rs?\b/i);
        if (!claim) return null;
        const actual = p.colors?.length ?? 0;
        return Number(claim[1]) === actual ? null : `says ${claim[1]} colors but lists ${actual}`;
      }),
      "Embedded color counts must match colors.length"
    );
  });

  it("uses a known category", () => {
    const known = new Set<string>(merchandiseCategories);
    expectNone(
      violations((p) => (known.has(p.category) ? null : `unknown category "${p.category}"`)),
      "Category must be one of merchandiseCategories"
    );
  });

  it("has a non-empty brand", () => {
    expectNone(
      violations((p) =>
        p.brand && p.brand === p.brand.trim() ? null : "missing or untrimmed brand"
      ),
      "Brand must be set and trimmed"
    );
  });

  it("references image files that exist and are webp/jpg/png", () => {
    expectNone(
      violations((p) => {
        const refs = [p.image, ...Object.values(p.colorImages ?? {})];
        for (const ref of refs) {
          if (!ref) return "missing image";
          if (!ref.startsWith("/")) return `image path "${ref}" must start with /`;
          if (!IMAGE_EXT.test(ref)) return `image "${ref}" is not webp/jpg/png`;
          if (!existsSync(path.join(publicDir, ref))) return `image file missing on disk: ${ref}`;
        }
        return null;
      }),
      "Every referenced image must exist under public/ as webp, jpg or png"
    );
  });

  it("gives every product its own image and an imageAlt", () => {
    const byImage = new Map<string, string[]>();
    for (const p of products) {
      if (p.image) byImage.set(p.image, [...(byImage.get(p.image) ?? []), p.id]);
    }
    expectNone(
      [...byImage]
        .filter(([, ids]) => ids.length > 1)
        .map(([img, ids]) => `${img}: shared by ${ids.join(", ")}`),
      "No two products may share an image path"
    );
    expectNone(
      violations((p) => (p.imageAlt && p.imageAlt.trim() ? null : "missing imageAlt")),
      "Every product needs imageAlt"
    );
  });

  it("has clean color lists when present", () => {
    expectNone(
      violations((p) => {
        if (!p.colors) return null;
        if (p.colors.length === 0) return "colors is an empty array";
        const seen = new Set<string>();
        for (const c of p.colors) {
          if (!c || c !== c.trim()) return `untrimmed or empty color "${c}"`;
          if (COLOR_DEBRIS.test(c)) return `stray text in color "${c}"`;
          if (seen.has(c)) return `duplicate color "${c}"`;
          seen.add(c);
        }
        return null;
      }),
      "Colors must be non-empty, trimmed, unique, and free of Show more/less"
    );
  });

  it("keeps curated and imported ids disjoint", () => {
    const curated = products.filter((p) => !importedIds.has(p.id));
    expect(curated.length).toBeGreaterThan(0);
    expect(products.length).toBe(curated.length + importedIds.size);
  });
});
