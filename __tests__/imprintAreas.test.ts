import { describe, expect, it } from "vitest";
import {
  CATEGORY_IMPRINT_DEFAULTS,
  getImprintArea,
  products,
  resolveImprintArea,
} from "@/config/merchandiseConfig";
import imprintAreasJson from "@/config/imprintAreas.json";

const OVERRIDES = imprintAreasJson as unknown as Record<
  string,
  { top?: number; left?: number; width?: number; hide?: boolean }
>;

const apparelDefault = CATEGORY_IMPRINT_DEFAULTS.Apparel;

describe("resolveImprintArea", () => {
  it("uses the category default when there is no override", () => {
    expect(resolveImprintArea({ id: "x", category: "Apparel" }, {})).toEqual(apparelDefault);
  });

  it("falls back to a centered default for an unknown category", () => {
    expect(resolveImprintArea({ id: "x", category: "Mystery" }, {})).toEqual({
      top: 50,
      left: 50,
      width: 22,
    });
  });

  it("lets a JSON entry replace the category default", () => {
    const area = resolveImprintArea(
      { id: "x", category: "Apparel" },
      { x: { top: 10, left: 20, width: 30 } }
    );
    expect(area).toEqual({ top: 10, left: 20, width: 30 });
  });

  it("merges a partial JSON entry over the category default", () => {
    const area = resolveImprintArea({ id: "x", category: "Apparel" }, { x: { width: 33 } });
    expect(area).toEqual({ ...apparelDefault, width: 33 });
  });

  it("ignores JSON entries for other products", () => {
    const area = resolveImprintArea({ id: "x", category: "Apparel" }, { y: { width: 33 } });
    expect(area).toEqual(apparelDefault);
  });

  it("carries the hide flag and keeps usable coordinates", () => {
    const area = resolveImprintArea({ id: "x", category: "Drinkware" }, { x: { hide: true } });
    expect(area.hide).toBe(true);
    expect(area).toMatchObject(CATEGORY_IMPRINT_DEFAULTS.Drinkware);
  });

  it("does not set hide when nothing flags it", () => {
    expect(resolveImprintArea({ id: "x", category: "Drinkware" }, {}).hide).toBeUndefined();
  });

  it("lets a product's own imprintArea win over the JSON entry", () => {
    const area = resolveImprintArea(
      { id: "x", category: "Apparel", imprintArea: { top: 1, left: 2, width: 3 } },
      { x: { top: 10, left: 20, width: 30, hide: true } }
    );
    expect(area).toEqual({ top: 1, left: 2, width: 3, hide: true });
  });

  it("getImprintArea reads the shipped imprintAreas.json", () => {
    const [id, entry] = Object.entries(OVERRIDES).find(([, e]) => !e.hide)!;
    const product = products.find((p) => p.id === id)!;
    expect(getImprintArea(product)).toMatchObject(entry);
  });
});

describe("imprintAreas.json", () => {
  const entries = Object.entries(OVERRIDES);
  const productIds = new Set(products.map((p) => p.id));

  it("only names products that exist in the catalog", () => {
    const unknown = entries.map(([id]) => id).filter((id) => !productIds.has(id));
    expect(unknown).toEqual([]);
  });

  it("only uses the known keys", () => {
    for (const [id, entry] of entries) {
      for (const key of Object.keys(entry)) {
        expect(["top", "left", "width", "hide"], `${id}.${key}`).toContain(key);
      }
    }
  });

  it("keeps every coordinate inside the photo (0-100) and widths positive", () => {
    for (const [id, entry] of entries) {
      for (const key of ["top", "left", "width"] as const) {
        const value = entry[key];
        if (value === undefined) continue;
        expect(typeof value, `${id}.${key}`).toBe("number");
        expect(value, `${id}.${key}`).toBeGreaterThanOrEqual(0);
        expect(value, `${id}.${key}`).toBeLessThanOrEqual(100);
      }
      if (entry.width !== undefined) expect(entry.width, `${id}.width`).toBeGreaterThan(0);
    }
  });

  it("is either a full placement or a hide flag, never a half-specified placement", () => {
    for (const [id, entry] of entries) {
      if (entry.hide !== undefined) {
        expect(entry.hide, `${id}.hide`).toBe(true);
        continue;
      }
      expect(typeof entry.top, `${id}.top`).toBe("number");
      expect(typeof entry.left, `${id}.left`).toBe("number");
      expect(typeof entry.width, `${id}.width`).toBe("number");
    }
  });

  it("does not combine a hide flag with coordinates", () => {
    for (const [id, entry] of entries) {
      if (entry.hide) expect(Object.keys(entry), id).toEqual(["hide"]);
    }
  });
});

describe("every catalog product resolves to a usable placement", () => {
  it("has a category default for every category in the catalog", () => {
    const missing = [...new Set(products.map((p) => p.category))].filter(
      (category) => !(category in CATEGORY_IMPRINT_DEFAULTS)
    );
    expect(missing).toEqual([]);
  });

  it("returns in-range numbers for all products", () => {
    for (const product of products) {
      const area = getImprintArea(product);
      for (const key of ["top", "left", "width"] as const) {
        expect(area[key], `${product.id}.${key}`).toBeGreaterThanOrEqual(0);
        expect(area[key], `${product.id}.${key}`).toBeLessThanOrEqual(100);
      }
      expect(area.width, `${product.id}.width`).toBeGreaterThan(0);
    }
  });
});
