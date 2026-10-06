import { describe, expect, it } from "vitest";
import {
  groupByCategory,
  merchandiseCategories,
  products,
  startingPrice,
} from "@/config/merchandiseConfig";
import {
  ESSENTIALS_BRAND,
  OTHER_TYPE,
  PRODUCT_TYPES,
  classifyProduct,
  orderByTypeAndBrand,
  productTypeOf,
  typesForCategory,
  type OrderableProduct,
} from "@/config/productTypes";

describe("the taxonomy", () => {
  it("covers every merchandise category, and nothing else", () => {
    expect(Object.keys(PRODUCT_TYPES).sort()).toEqual([...merchandiseCategories].sort());
  });

  it.each([...merchandiseCategories])(
    "%s has 5 to 14 types, no duplicates, Other last",
    (category) => {
      const { order } = PRODUCT_TYPES[category];
      expect(order.length).toBeGreaterThanOrEqual(5);
      expect(order.length).toBeLessThanOrEqual(14);
      expect(new Set(order).size).toBe(order.length);
      expect(order).not.toContain(OTHER_TYPE);
      const display = typesForCategory(category);
      expect(display[display.length - 1]).toBe(OTHER_TYPE);
    }
  );

  it.each([...merchandiseCategories])("%s: every rule names a type of the category", (category) => {
    const known = new Set(typesForCategory(category));
    for (const rule of PRODUCT_TYPES[category].rules) {
      expect(known.has(rule.type), `${category}: ${rule.type}`).toBe(true);
      expect(rule.name ?? rule.description).toBeDefined();
    }
  });

  it("has a rule for every type but Other", () => {
    for (const category of merchandiseCategories) {
      const ruled = new Set(PRODUCT_TYPES[category].rules.map((rule) => rule.type));
      for (const label of PRODUCT_TYPES[category].order) {
        expect(ruled.has(label), `${category}: ${label}`).toBe(true);
      }
    }
  });
});

describe("classifyProduct", () => {
  const apparel = (name: string, description = "") =>
    classifyProduct({ name, category: "Apparel", description });

  it("puts like things together by name", () => {
    expect(apparel("Peter Millar Men's Solid Performance Polo")).toBe("Polos");
    expect(apparel("Gildan Ultra Cotton T-Shirt")).toBe("T-Shirts");
    expect(apparel("Men's Peter Millar Pine Performance Hoodie")).toBe("Hoodies & Sweatshirts");
    expect(apparel("Adidas Women's Spacer Quarter-Zip Pullover")).toBe("Quarter-Zips & Pullovers");
    expect(apparel("Port Authority Denim Jacket")).toBe("Jackets & Outerwear");
    expect(apparel("Storm Creek Men's Front Runner Insulated Vest")).toBe("Vests");
  });

  it("lets the more specific rule win: Youth over Polos, Safety over Vests", () => {
    expect(apparel("Sublimated Traditional Youth Polo Shirt")).toBe("Youth");
    expect(apparel("High Visibility Reflective Safety Vest")).toBe("Workwear & Safety");
    // a long-sleeve polo is a polo, not a long sleeve shirt
    expect(apparel("Team 365 Men's Zone Performance Long Sleeve Polo")).toBe("Polos");
    // "Unisex & Kids'" is an adult-sized polo for everyone
    expect(apparel("Unisex & Kids' Sublimation Pique Polo")).toBe("Polos");
  });

  it("judges a name by what the product is, not by what it comes with", () => {
    const office = (name: string) => classifyProduct({ name, category: "Office & Writing" });
    expect(office("Eco Friendly Notebook with Pen")).toBe("Notebooks & Journals");
    expect(office("Bamboo Desk Organizer with Stylus Pen and Phone Holder")).toBe(
      "Desk Accessories"
    );
    expect(office("Stowaway Sticky Jotter With Pen")).toBe("Sticky Notes");
    expect(office("Cross Classic Century Ballpoint Pen")).toBe("Pens");
    // a rule marked to read the whole name still sees what follows "with"
    expect(
      classifyProduct({ name: "Tin Pail with Caramel Popcorn", category: "Food & Treats" })
    ).toBe("Popcorn");
    expect(
      classifyProduct({ name: "Lanyards with Badge Holder Combo", category: "Lanyards & Badges" })
    ).toBe("Lanyard & Badge Combos");
  });

  it("separates drinkware that is easy to mix up", () => {
    const drink = (name: string) => classifyProduct({ name, category: "Drinkware" });
    expect(drink("20 oz. Himalayan Tumbler")).toBe("Tumblers");
    expect(drink("40 oz. Hydrapeak Voyager Travel Mug")).toBe("Travel Mugs");
    expect(drink("11 oz. Traditional Ceramic Mug")).toBe("Coffee Mugs");
    expect(drink("RTIC Ceramic Lined 20 oz Essential Tumbler")).toBe("Tumblers");
    expect(drink("16 oz. Stemless Wine Tumbler")).toBe("Wine & Glassware");
    expect(drink("24 oz Owala Freesip Insulated Bottle")).toBe("Water Bottles");
    expect(drink("Magnetic Can Sleeve")).toBe("Can Coolers");
  });

  it("falls back to the description only when the name says nothing", () => {
    expect(
      classifyProduct({
        name: "40 oz. Kodiak Series",
        category: "Drinkware",
        description: "40 oz. tumbler that's made of double-wall stainless steel.",
      })
    ).toBe("Tumblers");
    // a description never overrides a name that matched
    expect(
      classifyProduct({
        name: "Classic Hard Cover Notebook",
        category: "Office & Writing",
        description: "Comes with a free pen and a sticky note pad.",
      })
    ).toBe("Notebooks & Journals");
  });

  it("is Other for what no rule recognises, and for an unknown category", () => {
    expect(classifyProduct({ name: "Mystery Item", category: "Apparel" })).toBe(OTHER_TYPE);
    expect(classifyProduct({ name: "Polo", category: "Nowhere" })).toBe(OTHER_TYPE);
  });

  it("is deterministic and remembers its answer per product", () => {
    const product = { name: "Nike Polo", category: "Apparel", description: "" };
    expect(productTypeOf(product)).toBe(productTypeOf(product));
    expect(classifyProduct(product)).toBe(classifyProduct({ ...product }));
  });
});

describe("every live product", () => {
  it("has exactly one type, of its own category's taxonomy", () => {
    for (const product of products) {
      const known = typesForCategory(product.category);
      expect(known, product.category).not.toEqual([]);
      expect(known, `${product.name} -> ${productTypeOf(product)}`).toContain(
        productTypeOf(product)
      );
    }
  });

  it("leaves fewer than 8% of each category, and 5% overall, as Other", () => {
    let other = 0;
    for (const category of merchandiseCategories) {
      const inCategory = products.filter((p) => p.category === category);
      const count = inCategory.filter((p) => productTypeOf(p) === OTHER_TYPE).length;
      other += count;
      expect(count / inCategory.length, `${category}: ${count} Other`).toBeLessThan(0.08);
    }
    expect(other / products.length).toBeLessThan(0.05);
  });
});

describe("orderByTypeAndBrand", () => {
  const item = (over: Partial<OrderableProduct> & { id: string }) => ({
    type: "Polos",
    brand: "Essentials",
    hasColorPhotos: false,
    price: 10,
    name: over.id,
    ...over,
  });
  const ids = (list: { id: string }[]) => list.map((entry) => entry.id);

  it("puts types in the taxonomy's order, whatever order they arrive in", () => {
    const sorted = orderByTypeAndBrand(
      [
        item({ id: "other", type: OTHER_TYPE }),
        item({ id: "hoodie", type: "Hoodies & Sweatshirts" }),
        item({ id: "polo", type: "Polos" }),
        item({ id: "tee", type: "T-Shirts" }),
      ],
      "Apparel"
    );
    expect(ids(sorted)).toEqual(["polo", "tee", "hoodie", "other"]);
  });

  it("orders brand blocks by size, then A to Z, with Essentials last", () => {
    const sorted = orderByTypeAndBrand(
      [
        item({ id: "e1" }),
        item({ id: "e2" }),
        item({ id: "e3" }),
        item({ id: "n1", brand: "Nike" }),
        item({ id: "p1", brand: "Peter Millar" }),
        item({ id: "p2", brand: "Peter Millar" }),
        item({ id: "a1", brand: "Adidas" }),
        item({ id: "z1", brand: "Zeta" }),
      ],
      "Apparel"
    );
    // the biggest name-brand block first, equal blocks A to Z, Essentials last
    // even though it is the largest block of all
    expect(ids(sorted)).toEqual(["p1", "p2", "a1", "n1", "z1", "e1", "e2", "e3"]);
  });

  it("never splits a brand's block, even if its products are far apart on price", () => {
    const sorted = orderByTypeAndBrand(
      [
        item({ id: "a-cheap", brand: "A", price: 1 }),
        item({ id: "b-mid", brand: "B", price: 5 }),
        item({ id: "a-dear", brand: "A", price: 99 }),
        item({ id: "b-mid2", brand: "B", price: 6 }),
      ],
      "Apparel"
    );
    expect(ids(sorted)).toEqual(["a-cheap", "a-dear", "b-mid", "b-mid2"]);
  });

  it("orders a block by color photos, then lowest price, then name", () => {
    const sorted = orderByTypeAndBrand(
      [
        item({ id: "dear", brand: "Nike", price: 50 }),
        item({ id: "photo-dear", brand: "Nike", price: 80, hasColorPhotos: true }),
        item({ id: "b", brand: "Nike", price: 20, name: "B" }),
        item({ id: "a", brand: "Nike", price: 20, name: "A" }),
        item({ id: "photo-cheap", brand: "Nike", price: 30, hasColorPhotos: true }),
      ],
      "Apparel"
    );
    expect(ids(sorted)).toEqual(["photo-cheap", "photo-dear", "a", "b", "dear"]);
  });

  it("is deterministic: the input order does not matter", () => {
    const list = [
      item({ id: "1", brand: "Nike", price: 5 }),
      item({ id: "2", brand: "Adidas", price: 5 }),
      item({ id: "3", type: "T-Shirts", price: 5 }),
      item({ id: "4", brand: "Nike", price: 5, name: "Z" }),
    ];
    const forward = ids(orderByTypeAndBrand(list, "Apparel"));
    expect(ids(orderByTypeAndBrand([...list].reverse(), "Apparel"))).toEqual(forward);
  });
});

describe("groupByCategory on the live catalog", () => {
  const groups = groupByCategory(products);
  const rank = (category: string) =>
    new Map(typesForCategory(category).map((label, index) => [label, index]));

  it("keeps every product once, in category order", () => {
    expect(groups.map((g) => g.category)).toEqual(
      merchandiseCategories.filter((c) => products.some((p) => p.category === c))
    );
    expect(groups.reduce((sum, g) => sum + g.items.length, 0)).toBe(products.length);
  });

  it.each(groups.map((g) => [g.category, g] as const))(
    "%s: types in order, brand blocks contiguous, Essentials last in each type",
    (category, group) => {
      const order = rank(category);
      let lastType = -1;
      const seenTypes = new Set<string>();
      let typeBrands = new Set<string>();
      let lastBrand = "";
      let essentialsSeen = false;
      let lastSize = Infinity;

      const sizeOf = new Map<string, number>();
      for (const product of group.items) {
        const key = `${productTypeOf(product)}|${product.brand}`;
        sizeOf.set(key, (sizeOf.get(key) ?? 0) + 1);
      }

      for (const product of group.items) {
        const type = productTypeOf(product);
        const index = order.get(type)!;
        expect(index, `${category}: ${product.name} (${type})`).toBeGreaterThanOrEqual(lastType);
        if (index !== lastType) {
          // a new type starts: it must never have appeared before
          expect(seenTypes.has(type), `${category}: ${type} is split`).toBe(false);
          seenTypes.add(type);
          lastType = index;
          typeBrands = new Set();
          lastBrand = "";
          essentialsSeen = false;
          lastSize = Infinity;
        }
        if (product.brand !== lastBrand) {
          expect(
            typeBrands.has(product.brand),
            `${category}/${type}: ${product.brand} is split into two blocks`
          ).toBe(false);
          typeBrands.add(product.brand);
          lastBrand = product.brand;
          if (product.brand === ESSENTIALS_BRAND) {
            essentialsSeen = true;
          } else {
            expect(essentialsSeen, `${category}/${type}: Essentials is not last`).toBe(false);
            const size = sizeOf.get(`${type}|${product.brand}`)!;
            expect(
              size,
              `${category}/${type}: ${product.brand} out of size order`
            ).toBeLessThanOrEqual(lastSize);
            lastSize = size;
          }
        }
      }
    }
  );

  it.each(groups.map((g) => [g.category, g] as const))(
    "%s: inside a block, color photos lead, then the lowest price, then the name",
    (_category, group) => {
      for (let i = 1; i < group.items.length; i++) {
        const a = group.items[i - 1];
        const b = group.items[i];
        if (productTypeOf(a) !== productTypeOf(b) || a.brand !== b.brand) continue;
        const photosA = Object.keys(a.colorImages ?? {}).length > 0;
        const photosB = Object.keys(b.colorImages ?? {}).length > 0;
        if (photosA !== photosB) {
          expect(photosA, `${a.name} / ${b.name}`).toBe(true);
          continue;
        }
        const delta = startingPrice(a) - startingPrice(b);
        expect(delta, `${a.name} / ${b.name}`).toBeLessThanOrEqual(0);
        if (delta === 0) {
          expect(
            a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })
          ).toBeLessThanOrEqual(0);
        }
      }
    }
  );

  it("Apparel: polos are together and come before t-shirts, and brands are not ranked first", () => {
    const apparel = groups.find((g) => g.category === "Apparel")!;
    const types = apparel.items.map((p) => productTypeOf(p));
    const lastPolo = types.lastIndexOf("Polos");
    const firstPolo = types.indexOf("Polos");
    expect(types.slice(firstPolo, lastPolo + 1).every((t) => t === "Polos")).toBe(true);
    expect(firstPolo).toBe(0);
    expect(lastPolo).toBeLessThan(types.indexOf("T-Shirts"));
    // the unbranded block is not shoved to the end of the category any more:
    // some Essentials product sits ahead of a name-brand one
    const firstEssentials = apparel.items.findIndex((p) => p.brand === ESSENTIALS_BRAND);
    const lastNamed = apparel.items.map((p) => p.brand).lastIndexOf("Peter Millar");
    expect(firstEssentials).toBeLessThan(apparel.items.length - 1);
    expect(apparel.items.slice(firstEssentials).some((p) => p.brand !== ESSENTIALS_BRAND)).toBe(
      true
    );
    expect(lastNamed).toBeGreaterThan(firstEssentials);
  });

  it("summarises each category's types in display order with block counts", () => {
    for (const group of groups) {
      expect(group.types.reduce((sum, t) => sum + t.count, 0)).toBe(group.items.length);
      const labels = group.types.map((t) => t.label);
      expect(labels).toEqual(typesForCategory(group.category).filter((l) => labels.includes(l)));
      for (const entry of group.types) {
        const brands = new Set(
          group.items.filter((p) => productTypeOf(p) === entry.label).map((p) => p.brand)
        );
        expect(entry.blocks).toBe(brands.size);
      }
    }
  });
});

import { BIG_TICKET_TYPE, isBigTicket } from "@/config/productTypes";

describe("big-ticket group", () => {
  const tiers = (q: number, p: number) => [{ quantity: q, price: p }];

  it("flags single-piece, high-price items outside clothing", () => {
    expect(isBigTicket({ category: "Home & Decor", priceTiers: tiers(1, 140) })).toBe(true);
    expect(isBigTicket({ category: "Event & Signage", priceTiers: tiers(10, 100) })).toBe(true);
    expect(isBigTicket({ category: "Tech Accessories", priceTiers: tiers(1, 69) })).toBe(true);
    expect(isBigTicket({ category: "Tech Accessories", priceTiers: tiers(3, 50) })).toBe(true);
  });

  it("leaves volume items, cheap singles and clothing alone", () => {
    expect(isBigTicket({ category: "Home & Decor", priceTiers: tiers(100, 140) })).toBe(false);
    expect(isBigTicket({ category: "Awards & Recognition", priceTiers: tiers(1, 29) })).toBe(false);
    expect(isBigTicket({ category: "Apparel", priceTiers: tiers(1, 150) })).toBe(false);
    expect(isBigTicket({ category: "Headwear", priceTiers: tiers(1, 80) })).toBe(false);
    expect(isBigTicket({ category: "Bags", priceTiers: tiers(25, 60) })).toBe(false);
  });

  it("is the last named group of every non-clothing category, and absent from clothing", () => {
    for (const category of ["Home & Decor", "Event & Signage", "Tech Accessories", "Bags"]) {
      const list = typesForCategory(category);
      expect(list[list.length - 1]).toBe("Other");
      expect(list[list.length - 2]).toBe(BIG_TICKET_TYPE);
    }
    expect(typesForCategory("Apparel")).not.toContain(BIG_TICKET_TYPE);
    expect(typesForCategory("Headwear")).not.toContain(BIG_TICKET_TYPE);
  });
});
