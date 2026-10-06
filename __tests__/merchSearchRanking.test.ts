import { describe, expect, it } from "vitest";
import { getImprintArea, products } from "@/config/merchandiseConfig";
import {
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

describe("search ranking: where the word sits in the name", () => {
  it("ranks the product's noun above an extra mentioned after 'with'", () => {
    const list = [
      product({ id: "speaker", name: "Bluetooth Speaker with Lanyard", category: "Tech" }),
      product({ id: "real", name: "Polyester Lanyard", category: "Tech" }),
    ];
    expect(ids(search(list, "lanyard"))).toEqual(["real", "speaker"]);
  });

  it("ranks a name's own noun above the same word earlier in the name", () => {
    const list = [
      product({ id: "calendar", name: "Large Memo Apron Wall Calendar" }),
      product({ id: "apron", name: "Cotton Canvas Apron" }),
    ];
    expect(ids(search(list, "apron"))).toEqual(["apron", "calendar"]);
  });

  it("skips sizes and 'kit' when finding the noun, and sees through 'bag' and 'stand'", () => {
    const list = [
      product({ id: "mention", name: "Tent Stake Anchor Pack" }),
      product({ id: "sized", name: "Event Tent 10 x 10 in" }),
      product({ id: "stand", name: "Retractable Banner Stand" }),
      product({ id: "tail", name: "Pole with Banner" }),
    ];
    expect(ids(search(list, "tent"))[0]).toBe("sized");
    expect(ids(search(list, "banner"))).toEqual(["stand", "tail"]);
    const totes = [
      product({ id: "stake", name: "Tote Stake Bundle" }),
      product({ id: "tote-bag", name: "Canvas Tote Bag" }),
      product({ id: "tail", name: "Cooler with Tote" }),
    ];
    expect(ids(search(totes, "tote"))).toEqual(["tote-bag", "stake", "tail"]);
  });

  it("still ranks a word after 'with' above a mere prefix match", () => {
    const list = [
      product({ id: "prefix", name: "Pinwheel Toy" }),
      product({ id: "tail", name: "Button with Safety Pin" }),
    ];
    expect(ids(search(list, "pin"))).toEqual(["tail", "prefix"]);
  });
});

describe("search ranking: category and description", () => {
  it("boosts a name match in the category the query names", () => {
    const list = [
      product({ id: "wallet", name: "Lanyard Wallet", category: "Tech Accessories" }),
      product({ id: "real", name: "Flat Lanyard", category: "Lanyards & Badges" }),
    ];
    expect(ids(search(list, "lanyards"))).toEqual(["real", "wallet"]);
  });

  it("ranks a description-only match below name, brand, category and color matches", () => {
    const list = [
      product({ id: "desc", name: "Phone Stand", description: "Holds your pen." }),
      product({ id: "color", name: "Phone Case", colors: ["Pen Green"] }),
      product({ id: "category", name: "Sticky Pad", category: "Pen Accessories" }),
      product({ id: "brand", name: "Pad", brand: "Pen Co" }),
      product({ id: "name", name: "Gel Pen" }),
    ];
    expect(ids(search(list, "pen"))).toEqual(["name", "brand", "category", "color", "desc"]);
  });

  it("is deterministic: ties keep the input order", () => {
    const list = [
      product({ id: "a", name: "Red Mug" }),
      product({ id: "b", name: "Blue Mug" }),
      product({ id: "c", name: "Green Mug" }),
    ];
    expect(ids(search(list, "mug"))).toEqual(["a", "b", "c"]);
    expect(ids(search([...list].reverse(), "mug"))).toEqual(["c", "b", "a"]);
  });
});

describe("search ranking: real catalog", () => {
  const catalog = products.map((p) => toCatalogProduct(p, getImprintArea(p)));
  const top = (query: string, count: number) => search(catalog, query).slice(0, count);
  const names = (list: CatalogProduct[]) => list.map((p) => p.name);

  it("puts real lanyards first for 'lanyard' and 'lanyards'", () => {
    for (const query of ["lanyard", "lanyards"]) {
      const first = top(query, 8);
      expect(first.every((p) => p.category === "Lanyards & Badges")).toBe(true);
      expect(first.every((p) => /lanyard/i.test(p.name))).toBe(true);
    }
    // products that merely come "with Lanyard" are still found, but after every real lanyard
    const all = search(catalog, "lanyard");
    const isLanyard = (p: CatalogProduct) =>
      p.category === "Lanyards & Badges" && /lanyard/i.test(p.name);
    const firstOther = all.findIndex((p) => !isLanyard(p));
    expect(firstOther).toBeGreaterThan(0);
    expect(all.slice(firstOther).some(isLanyard)).toBe(false);
    expect(all.some((p) => p.category === "Tech Accessories" && /lanyard/i.test(p.name))).toBe(
      true
    );
  });

  it("leads with flags, not sticky-note flags, for 'flag'", () => {
    for (const query of ["flag", "flags"]) {
      const first = top(query, 6);
      expect(first.every((p) => p.category === "Event & Signage")).toBe(true);
      expect(first.every((p) => /\bflags?\b/i.test(p.name))).toBe(true);
    }
    // the sticky-note, journal and notepad products that mention flags come after the real flags
    const all = search(catalog, "flag");
    const stationery = (p: CatalogProduct) => /sticky|journal|notepad|notebook/i.test(p.name);
    expect(all.slice(0, 11).some(stationery)).toBe(false);
    expect(all.filter(stationery).length).toBeGreaterThan(0);
  });

  it("returns umbrellas, and only umbrellas, for 'umbrella' and 'umbrellas'", () => {
    const all = search(catalog, "umbrella");
    expect(all.length).toBeGreaterThanOrEqual(5);
    expect(all.every((p) => p.category === "Outdoor & Sports" && /umbrella/i.test(p.name))).toBe(
      true
    );
    expect(names(top("umbrellas", 3))).toEqual(names(top("umbrella", 3)));
  });

  it("leads with pins, not pink or pinhole products, for 'pin'", () => {
    const first = top("pin", 10);
    expect(first.every((p) => /\bpins?\b/i.test(p.name))).toBe(true);
    const all = search(catalog, "pin");
    const firstPrefix = all.findIndex((p) => !/\bpins?\b/i.test(p.name));
    const lastPin = all.map((p) => /\bpins?\b/i.test(p.name)).lastIndexOf(true);
    expect(firstPrefix).toBeGreaterThan(lastPin);
  });

  it.each<[string, RegExp, number?]>([
    ["tote", /tote/i],
    ["mug", /mug/i],
    ["tumbler", /tumbler/i],
    ["pen", /\bpens?\b/i],
    ["hat", /\bhats?\b/i],
    ["cap", /\bcaps?\b/i],
    ["polo", /polo/i],
    ["banner", /banner/i],
    ["sticker", /sticker/i],
    ["magnet", /magnet/i],
    ["notebook", /notebook/i],
    ["cooler", /cooler/i],
    ["bottle", /bottle/i],
    ["apron", /apron/i, 3],
    ["hoodie", /hoodie/i],
    ["jacket", /jacket/i],
    ["charger", /charger/i],
    ["speaker", /speaker/i],
    ["tent", /tent/i, 4],
  ])("'%s' leads with products named for it", (query, pattern, count = 5) => {
    const first = top(query, count);
    expect(first.length).toBe(count);
    expect(first.every((p) => pattern.test(p.name))).toBe(true);
  });
});
