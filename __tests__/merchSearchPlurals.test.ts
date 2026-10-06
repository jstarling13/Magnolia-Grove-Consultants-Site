import { describe, expect, it } from "vitest";
import { getImprintArea, products } from "@/config/merchandiseConfig";
import {
  matchesQuery,
  searchHaystack,
  searchProducts,
  toCatalogProduct,
  type CatalogProduct,
} from "@/lib/merchCatalog";

const AREA = { top: 40, left: 50, width: 20 };

function product(overrides: Partial<CatalogProduct> & { id: string }): CatalogProduct {
  return {
    name: overrides.id,
    category: "Apparel",
    brand: "Essentials",
    description: "",
    tiers: [{ quantity: 50, price: 10 }],
    imprintArea: AREA,
    ...overrides,
  };
}

const hay = (p: CatalogProduct) => searchHaystack(p);
const ids = (list: CatalogProduct[]) => list.map((p) => p.id);
const search = (list: CatalogProduct[], query: string) => searchProducts(list, query, hay);

describe("search: plurals", () => {
  const list = [
    product({ id: "mug", name: "Ceramic Mug" }),
    product({ id: "tote", name: "Canvas Tote" }),
    product({ id: "beanie", name: "Knit Beanie" }),
    product({ id: "battery", name: "Battery Pack" }),
    product({ id: "box", name: "Gift Box" }),
    product({ id: "glass", name: "Glass Jar" }),
    product({ id: "dress", name: "Dress Shirt" }),
    product({ id: "bus", name: "Bus Tour Sign" }),
  ];

  it("finds a singular product from a plural query and the reverse", () => {
    expect(ids(search(list, "mugs"))).toEqual(["mug"]);
    expect(ids(search(list, "totes"))).toEqual(["tote"]);
    expect(ids(search(list, "beanies"))).toEqual(["beanie"]);
    expect(ids(search(list, "batteries"))).toEqual(["battery"]);
    expect(ids(search(list, "boxes"))).toEqual(["box"]);
    const plural = [product({ id: "p", name: "Travel Mugs" })];
    expect(ids(search(plural, "mug"))).toEqual(["p"]);
    expect(ids(search(plural, "mugs"))).toEqual(["p"]);
  });

  it("ranks a plural word as a whole-word match for the singular query", () => {
    const both = [
      product({ id: "prefix", name: "Mugwort Candle" }),
      product({ id: "plural", name: "Travel Mugs" }),
    ];
    expect(ids(search(both, "mug"))).toEqual(["plural", "prefix"]);
  });

  it("leaves words that only look plural alone", () => {
    expect(ids(search(list, "glass"))).toEqual(["glass"]);
    expect(ids(search(list, "glasses"))).toEqual(["glass"]);
    expect(ids(search(list, "dress"))).toEqual(["dress"]);
    expect(ids(search(list, "bus"))).toEqual(["bus"]);
    // "bus" must not be cut to "bu"/"b" and match everything starting with b
    expect(ids(search(list, "bus"))).not.toContain("battery");
  });

  it("works through matchesQuery as well", () => {
    expect(matchesQuery(hay(list[0]), "mugs")).toBe(true);
    expect(matchesQuery(hay(list[0]), "totes")).toBe(false);
  });
});

describe("search: synonyms", () => {
  const list = [
    product({ id: "golf-tee", name: "Wooden Golf Tee", category: "Outdoor" }),
    product({ id: "tshirt", name: "Cotton T-Shirt" }),
    product({ id: "sweat", name: "Crew Sweatshirt" }),
    product({ id: "can", name: "Foam Can Cooler Holder" }),
    product({ id: "knit", name: "Warm Knit Cap" }),
    product({ id: "beanie", name: "Cuffed Beanie" }),
    product({ id: "tote-bag", name: "Canvas Tote Bag" }),
    product({ id: "plain-tote", name: "Market Tote" }),
    product({ id: "hoodie", name: "Zip Hoodie" }),
  ];

  it("treats tshirt, t shirt, t-shirt and tee as the same thing, ranking the typed word first", () => {
    for (const q of ["tshirt", "t shirt", "t-shirt", "T-Shirts"]) {
      expect(ids(search(list, q)), q).toContain("tshirt");
    }
    // typed "tee": the literal match (golf tee) comes before the synonym match
    expect(ids(search(list, "tee"))).toEqual(["golf-tee", "tshirt"]);
    // typed "tshirt": the real T-shirt is found and a sweatshirt is not
    expect(ids(search(list, "tshirt"))).toContain("tshirt");
    expect(ids(search(list, "tshirt"))).not.toContain("sweat");
  });

  it("maps koozie and coozie to can coolers, sleeves and holders", () => {
    expect(ids(search(list, "koozie"))).toEqual(["can"]);
    expect(ids(search(list, "coozies"))).toEqual(["can"]);
    expect(ids(search(list, "can sleeve"))).toEqual(["can"]);
  });

  it("maps beanie and knit cap to each other", () => {
    expect(ids(search(list, "beanie")).sort()).toEqual(["beanie", "knit"]);
    expect(ids(search(list, "knit cap")).sort()).toEqual(["beanie", "knit"]);
    // the typed form ranks first
    expect(ids(search(list, "beanies"))[0]).toBe("beanie");
    expect(ids(search(list, "knit cap"))[0]).toBe("knit");
  });

  it("maps tote and tote bag, and hoodie and sweatshirt", () => {
    expect(ids(search(list, "tote bag"))).toEqual(["tote-bag", "plain-tote"]);
    expect(ids(search(list, "totes"))).toEqual(["tote-bag", "plain-tote"]);
    expect(ids(search(list, "hoodie"))).toEqual(["hoodie", "sweat"]);
  });

  it("keeps AND semantics across a synonym and another term", () => {
    const colored = [
      product({ id: "navy-tee", name: "Navy T-Shirt" }),
      product({ id: "red-tee", name: "Red T-Shirt" }),
    ];
    expect(ids(search(colored, "navy tshirt"))).toEqual(["navy-tee"]);
  });
});

describe("search: real catalog", () => {
  const catalog = products.map((p) => toCatalogProduct(p, getImprintArea(p)));
  const found = (q: string) => searchProducts(catalog, q, hay);

  it("returns products for plural and synonym queries", () => {
    for (const q of [
      "totes",
      "beanies",
      "mugs",
      "pens",
      "tumblers",
      "hats",
      "caps",
      "koozie",
      "coozie",
    ]) {
      expect(found(q).length, q).toBeGreaterThan(0);
    }
  });

  it("finds at least as many products for a plural as for its singular", () => {
    for (const [plural, singular] of [
      ["mugs", "mug"],
      ["pens", "pen"],
      ["tumblers", "tumbler"],
      ["hats", "hat"],
      ["caps", "cap"],
      ["totes", "tote"],
    ]) {
      expect(found(plural).length, plural).toBeGreaterThanOrEqual(found(singular).length);
    }
  });

  it("koozie finds can coolers", () => {
    const names = found("koozie").map((p) => p.name.toLowerCase());
    expect(names.some((name) => /can (cooler|sleeve|holder)/.test(name))).toBe(true);
  });

  it("beanies finds the beanies, and beanie ranks them before knit caps", () => {
    const first = found("beanies").slice(0, 5);
    expect(first.every((p) => /beanie/i.test(p.name))).toBe(true);
  });

  it("tshirt returns actual T-shirts first, not sweatshirts", () => {
    const results = found("tshirt");
    expect(results.length).toBeGreaterThan(0);
    const firstTen = results.slice(0, 10);
    expect(firstTen.every((p) => /t[- ]?shirt|tee/i.test(p.name))).toBe(true);
    expect(
      results.some((p) => /sweatshirt/i.test(p.name) && !/t[- ]?shirt|tee/i.test(p.name))
    ).toBe(false);
  });

  it("t-shirt, t shirt and tshirt find the same products", () => {
    const sorted = (q: string) =>
      found(q)
        .map((p) => p.id)
        .sort();
    expect(sorted("t-shirt")).toEqual(sorted("tshirt"));
    expect(sorted("t shirt")).toEqual(sorted("tshirt"));
  });

  it("does not pull plain 'glass' or 'dress' queries into unrelated products", () => {
    expect(found("dress").length).toBeLessThan(found("d").length);
    for (const p of found("dress")) expect(/dress/i.test(searchHaystack(p))).toBe(true);
  });
});
