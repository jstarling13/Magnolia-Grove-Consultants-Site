import { describe, expect, it } from "vitest";
import { getStorefrontCatalog } from "@/lib/merchStorefront";
import {
  FILTER_ALL,
  MANY_COLORS,
  NO_FILTERS,
  SORT_OPTIONS,
  categoriesNeeded,
  filterProducts,
  hasColorPhotos,
  hasProductFilters,
  isMadeInUsa,
  isSortKey,
  matchesFilters,
  realBrands,
  searchHaystack,
  searchProducts,
  sortProducts,
  startingTier,
  type CatalogProduct,
  type ProductFilters,
} from "@/lib/merchCatalog";
import {
  CLEAR_ALL,
  DEFAULT_PARAMS,
  activeFilterChips,
  applyCatalogParams,
  filtersKey,
  hasActiveParams,
  parseCatalogParams,
  priceBuckets,
  priceBucketsFor,
  priceRangeLabel,
  sameParams,
  type CatalogParams,
} from "@/lib/merchFilters";

const catalog = getStorefrontCatalog();
const PRODUCTS = catalog.products;
const BRANDS = realBrands(PRODUCTS);
const CONTEXT = { categories: catalog.categories, brands: BRANDS };

function make(id: string, overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id,
    name: `Product ${id}`,
    category: "Apparel",
    brand: "Essentials",
    description: "A product.",
    tiers: [{ quantity: 50, price: 5 }],
    imprintArea: { top: 50, left: 50, width: 20 },
    ...overrides,
  };
}

const ids = (list: CatalogProduct[]) => list.map((product) => product.id);

describe("the real catalog has what the filters need", () => {
  it("is large enough to mean something", () => {
    expect(PRODUCTS.length).toBeGreaterThan(500);
  });

  it("has made-in-USA, many-color, color-photo and low-minimum products", () => {
    expect(PRODUCTS.filter(isMadeInUsa).length).toBeGreaterThan(50);
    expect(PRODUCTS.filter((p) => (p.colors?.length ?? 0) >= MANY_COLORS).length).toBeGreaterThan(
      50
    );
    expect(PRODUCTS.filter(hasColorPhotos).length).toBeGreaterThan(50);
    expect(PRODUCTS.filter((p) => startingTier(p).quantity <= 25).length).toBeGreaterThan(50);
  });
});

describe("sortProducts: the new keys", () => {
  it("lists every sort key once, relevance first, and recognises it as a key", () => {
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual([
      "featured",
      "price-asc",
      "price-desc",
      "moq-asc",
      "colors-desc",
      "name",
    ]);
    expect(SORT_OPTIONS[0].label).toBe("Relevance");
    for (const option of SORT_OPTIONS) expect(isSortKey(option.value)).toBe(true);
    expect(isSortKey("bogus")).toBe(false);
  });

  it("orders the real catalog by first-tier price, either way", () => {
    const asc = sortProducts(PRODUCTS, "price-asc").map((p) => startingTier(p).price);
    const desc = sortProducts(PRODUCTS, "price-desc").map((p) => startingTier(p).price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(asc.length).toBe(PRODUCTS.length);
  });

  it("orders the real catalog by smallest order, then by relevance order", () => {
    const sorted = sortProducts(PRODUCTS, "moq-asc");
    const rank = new Map(PRODUCTS.map((p, index) => [p.id, index]));
    for (let i = 1; i < sorted.length; i++) {
      const [a, b] = [sorted[i - 1], sorted[i]];
      const [qa, qb] = [startingTier(a).quantity, startingTier(b).quantity];
      expect(qa).toBeLessThanOrEqual(qb);
      if (qa === qb) expect(rank.get(a.id)!).toBeLessThan(rank.get(b.id)!);
    }
  });

  it("orders the real catalog by number of colors, most first", () => {
    const sorted = sortProducts(PRODUCTS, "colors-desc");
    const counts = sorted.map((p) => p.colors?.length ?? 0);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(counts[0]).toBeGreaterThanOrEqual(MANY_COLORS);
    expect(counts.at(-1)).toBe(0);
  });

  it("orders by name A to Z", () => {
    const names = sortProducts(PRODUCTS, "name").map((p) => p.name);
    const expected = [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
    );
    expect(names).toEqual(expected);
  });

  it("keeps ties in the incoming order and never changes its input", () => {
    const list = [
      make("a", { colors: ["Red", "Blue"] }),
      make("b", { colors: ["Red", "Blue"] }),
      make("c", { colors: ["Red"] }),
      make("d", { colors: ["Red", "Blue", "Green"] }),
    ];
    const before = ids(list);
    expect(ids(sortProducts(list, "colors-desc"))).toEqual(["d", "a", "b", "c"]);
    expect(ids(list)).toEqual(before);
  });

  it("sorting a search result keeps the search ranking as the tie-break", () => {
    const ranked = searchProducts(PRODUCTS, "mug", searchHaystack);
    expect(ranked.length).toBeGreaterThan(3);
    const sorted = sortProducts(ranked, "moq-asc");
    const position = new Map(ranked.map((p, index) => [p.id, index]));
    for (let i = 1; i < sorted.length; i++) {
      const [a, b] = [sorted[i - 1], sorted[i]];
      if (startingTier(a).quantity === startingTier(b).quantity) {
        expect(position.get(a.id)!).toBeLessThan(position.get(b.id)!);
      }
    }
    // "featured" is the identity: relevance order is untouched.
    expect(ids(sortProducts(ranked, "featured"))).toEqual(ids(ranked));
  });
});

describe("isMadeInUsa", () => {
  it("is true only for products whose own text says made in the USA", () => {
    for (const product of PRODUCTS.filter(isMadeInUsa)) {
      expect(`${product.name} ${product.description}`, product.id).toMatch(
        /made[\s-]+in[\s-]+(?:the[\s-]+)?(?:usa|u\.s\.a?\.?|united states)|usa[\s-]+made/i
      );
    }
  });

  it("does not count printed-in, decorated-in or flag products as made in the USA", () => {
    const printed = PRODUCTS.find((p) => /printed in usa/i.test(p.description));
    const decorated = PRODUCTS.find((p) => /usa decorated/i.test(p.name));
    const flag = PRODUCTS.find((p) => /^USA Printed Stick Flags/.test(p.name));
    for (const product of [printed, decorated, flag]) {
      expect(product).toBeDefined();
      expect(isMadeInUsa(product!)).toBe(false);
    }
  });

  it("treats a product that says nothing as unknown, and honours an explicit field", () => {
    expect(isMadeInUsa(make("x"))).toBe(false);
    expect(isMadeInUsa(make("y", { description: "Made in the USA. Sturdy." }))).toBe(true);
    expect(isMadeInUsa(make("z", { description: "USA made leather patch" }))).toBe(true);
    expect(isMadeInUsa(make("f", { usa: true }))).toBe(true);
    expect(isMadeInUsa(make("g", { usa: false, description: "Made in USA" }))).toBe(false);
  });
});

describe("filterProducts on the real catalog", () => {
  const only = (filters: Partial<ProductFilters>): ProductFilters => ({
    ...NO_FILTERS,
    ...filters,
  });

  it("returns the very same list when no filter is set", () => {
    expect(filterProducts(PRODUCTS, NO_FILTERS)).toBe(PRODUCTS);
    expect(hasProductFilters(NO_FILTERS)).toBe(false);
  });

  it("Made in USA keeps exactly the products that say so", () => {
    const result = filterProducts(PRODUCTS, only({ usa: true }));
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(PRODUCTS.length);
    expect(result.every(isMadeInUsa)).toBe(true);
    expect(PRODUCTS.filter((p) => !result.includes(p)).some(isMadeInUsa)).toBe(false);
  });

  it("price range is min inclusive, max exclusive, on the first tier", () => {
    const result = filterProducts(PRODUCTS, only({ price: { min: 5, max: 15 } }));
    expect(result.length).toBeGreaterThan(0);
    for (const product of result) {
      const price = startingTier(product).price;
      expect(price).toBeGreaterThanOrEqual(5);
      expect(price).toBeLessThan(15);
    }
    const open = filterProducts(PRODUCTS, only({ price: { min: 40, max: null } }));
    expect(open.every((p) => startingTier(p).price >= 40)).toBe(true);
    const under = filterProducts(PRODUCTS, only({ price: { min: null, max: 2.5 } }));
    expect(under.every((p) => startingTier(p).price < 2.5)).toBe(true);
  });

  it("minimum quantity keeps products whose smallest order is at most N units", () => {
    const counts = [25, 100, 250].map((minQty) => {
      const result = filterProducts(PRODUCTS, only({ minQty }));
      expect(result.every((p) => startingTier(p).quantity <= minQty)).toBe(true);
      return result.length;
    });
    expect(counts[0]).toBeLessThan(counts[1]);
    expect(counts[1]).toBeLessThan(counts[2]);
    expect(counts[2]).toBeLessThanOrEqual(PRODUCTS.length);
  });

  it("10+ colors and color photos", () => {
    const many = filterProducts(PRODUCTS, only({ manyColors: true }));
    expect(many.every((p) => (p.colors?.length ?? 0) >= 10)).toBe(true);
    const photos = filterProducts(PRODUCTS, only({ photos: true }));
    expect(photos.every(hasColorPhotos)).toBe(true);
    expect(photos.length).toBeGreaterThan(0);
  });

  it("filters combine with AND and never reorder", () => {
    const filters = only({ usa: true, minQty: 100, photos: false, manyColors: false });
    const result = filterProducts(PRODUCTS, filters);
    expect(result.every((p) => matchesFilters(p, filters))).toBe(true);
    const positions = result.map((p) => PRODUCTS.indexOf(p));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(result.length).toBeLessThanOrEqual(filterProducts(PRODUCTS, only({ usa: true })).length);
  });

  it("works together with search: filter first, then rank", () => {
    const filters = only({ minQty: 100 });
    const filtered = filterProducts(PRODUCTS, filters);
    const hits = searchProducts(filtered, "tote", searchHaystack);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((p) => matchesFilters(p, filters))).toBe(true);
    // The same ranking the unfiltered search gives, restricted to the survivors.
    const unfiltered = searchProducts(PRODUCTS, "tote", searchHaystack).filter((p) =>
      matchesFilters(p, filters)
    );
    expect(ids(hits)).toEqual(ids(unfiltered));
  });
});

describe("categoriesNeeded with filters", () => {
  const categories = ["Apparel", "Bags"];
  const base = { category: FILTER_ALL, brand: FILTER_ALL, query: "", sort: "featured" as const };

  it("needs nothing extra with no narrowing, even with an empty filter set", () => {
    expect(categoriesNeeded(base, categories)).toEqual([]);
    expect(categoriesNeeded({ ...base, filters: NO_FILTERS }, categories)).toEqual([]);
  });

  it("needs every category once a product filter or a new sort is on", () => {
    expect(
      categoriesNeeded({ ...base, filters: { ...NO_FILTERS, usa: true } }, categories)
    ).toEqual(categories);
    expect(categoriesNeeded({ ...base, sort: "moq-asc" }, categories)).toEqual(categories);
  });
});

describe("priceBuckets", () => {
  it("cuts the real catalog into ordered buckets that cover every product exactly once", () => {
    const buckets = priceBucketsFor(PRODUCTS);
    expect(buckets.length).toBeGreaterThanOrEqual(3);
    expect(buckets[0].min).toBeNull();
    expect(buckets.at(-1)!.max).toBeNull();
    for (let i = 1; i < buckets.length; i++) expect(buckets[i].min).toBe(buckets[i - 1].max);
    const sizes = buckets.map(
      (bucket) => filterProducts(PRODUCTS, { ...NO_FILTERS, price: bucket }).length
    );
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(PRODUCTS.length);
    // Roughly equal groups: no bucket is empty or swallows most of the catalog.
    for (const size of sizes) {
      expect(size).toBeGreaterThan(PRODUCTS.length * 0.05);
      expect(size).toBeLessThan(PRODUCTS.length * 0.5);
    }
  });

  it("uses round numbers and readable labels", () => {
    const labels = priceBucketsFor(PRODUCTS).map((bucket) => bucket.label);
    expect(labels[0]).toMatch(/^Under \$\d/);
    expect(labels.at(-1)).toMatch(/^\$[\d.]+ and up$/);
    for (const label of labels) expect(label).not.toMatch(/\.\d{3}|NaN|undefined/);
  });

  it("follows the data: a cheap set and a dear set get different cuts", () => {
    const cheap = priceBuckets([0.5, 0.9, 1.2, 1.5, 2, 2.4, 3, 3.5, 4, 4.5]);
    const dear = priceBuckets([50, 90, 120, 150, 200, 240, 300, 350, 400, 450]);
    expect(cheap.at(-1)!.min!).toBeLessThan(5);
    expect(dear[0].max!).toBeGreaterThan(50);
  });

  it("returns nothing when there is no spread to cut", () => {
    expect(priceBuckets([])).toEqual([]);
    expect(priceBuckets([5])).toEqual([]);
    expect(priceBuckets([5, 5, 5, 5])).toEqual([]);
  });

  it("labels ranges", () => {
    expect(priceRangeLabel({ min: null, max: 2.5 })).toBe("Under $2.50");
    expect(priceRangeLabel({ min: 5, max: 15 })).toBe("$5 to $15");
    expect(priceRangeLabel({ min: 40, max: null })).toBe("$40 and up");
  });
});

describe("URL state", () => {
  const withFilters = (filters: Partial<ProductFilters>): ProductFilters => ({
    ...NO_FILTERS,
    ...filters,
  });
  const samples: CatalogParams[] = [
    DEFAULT_PARAMS,
    { ...DEFAULT_PARAMS, category: catalog.categories[1] },
    { ...DEFAULT_PARAMS, brand: BRANDS[0], query: "water bottle", sort: "moq-asc" },
    { ...DEFAULT_PARAMS, sort: "colors-desc", filters: withFilters({ manyColors: true }) },
    {
      category: catalog.categories[0],
      brand: BRANDS[2],
      query: "t-shirt & tank",
      sort: "price-desc",
      filters: {
        usa: true,
        photos: true,
        manyColors: true,
        minQty: 250,
        price: { min: 2.5, max: 15 },
      },
    },
    { ...DEFAULT_PARAMS, filters: withFilters({ price: { min: 40, max: null } }) },
    { ...DEFAULT_PARAMS, filters: withFilters({ price: { min: null, max: 2.5 } }) },
    { ...DEFAULT_PARAMS, filters: withFilters({ minQty: 25 }) },
  ];

  it.each(samples.map((params, index) => [index, params] as const))(
    "round-trips sample %i through the query string",
    (_index, params) => {
      const search = applyCatalogParams("", params);
      expect(sameParams(parseCatalogParams(search, CONTEXT), params)).toBe(true);
      // and through a leading "?", as location.search has it
      expect(sameParams(parseCatalogParams(`?${search}`, CONTEXT), params)).toBe(true);
    }
  );

  it("writes nothing for the defaults and short keys for the rest", () => {
    expect(applyCatalogParams("", DEFAULT_PARAMS)).toBe("");
    const search = applyCatalogParams("", samples[4]);
    const keys = [...new URLSearchParams(search).keys()].sort();
    expect(keys).toEqual([
      "brand",
      "category",
      "colors",
      "minqty",
      "photos",
      "price",
      "q",
      "sort",
      "usa",
    ]);
    expect(new URLSearchParams(search).get("price")).toBe("2.5-15");
  });

  it("keeps unrelated parameters and removes cleared ones", () => {
    const start = "utm_source=mail&usa=1&brand=Nike&q=old";
    const next = applyCatalogParams(start, DEFAULT_PARAMS);
    expect(next).toBe("utm_source=mail");
    const again = applyCatalogParams("utm_source=mail", { ...DEFAULT_PARAMS, sort: "name" });
    expect(new URLSearchParams(again).get("utm_source")).toBe("mail");
    expect(new URLSearchParams(again).get("sort")).toBe("name");
  });

  it("ignores anything unknown or malformed instead of failing", () => {
    const parsed = parseCatalogParams(
      "category=Nope&brand=Nobody&sort=bogus&usa=yes&photos=0&colors=9&minqty=77&price=abc",
      CONTEXT
    );
    expect(sameParams(parsed, DEFAULT_PARAMS)).toBe(true);
    for (const bad of ["-", "5", "15-5", "5-5", "1e3-4", "-3-4", "1.234-9", "$5-10", ""]) {
      expect(parseCatalogParams(`price=${bad}`, CONTEXT).filters.price, bad).toBeNull();
    }
    expect(parseCatalogParams("price=5-", CONTEXT).filters.price).toEqual({ min: 5, max: null });
    // a category page has no categories to check against, so the key is ignored
    expect(parseCatalogParams("category=Apparel", { brands: BRANDS }).category).toBe(FILTER_ALL);
  });

  it("caps an absurdly long search", () => {
    expect(parseCatalogParams(`q=${"a".repeat(500)}`, CONTEXT).query.length).toBeLessThanOrEqual(
      120
    );
  });

  it("filtersKey tells filter sets apart", () => {
    const keys = new Set(samples.map((sample) => filtersKey(sample.filters)));
    expect(keys.size).toBe(6);
    expect(filtersKey(NO_FILTERS)).toBe(filtersKey({ ...NO_FILTERS }));
  });
});

describe("active filter chips", () => {
  const full: CatalogParams = {
    category: "Apparel",
    brand: "Nike",
    query: "tee",
    sort: "name",
    filters: { usa: true, photos: true, manyColors: true, minQty: 100, price: { min: 5, max: 15 } },
  };

  it("lists one chip per active filter, in a steady order, and not the category or sort", () => {
    expect(activeFilterChips(full).map((chip) => chip.label)).toEqual([
      "Search: tee",
      "Brand: Nike",
      "Made in USA",
      "Price: $5 to $15",
      "Minimum order: 100 or fewer",
      "10+ colors",
      "Has color photos",
    ]);
    expect(activeFilterChips(DEFAULT_PARAMS)).toEqual([]);
  });

  it("each chip removes exactly its own filter", () => {
    for (const chip of activeFilterChips(full)) {
      const next = { ...full, ...chip.remove };
      const remaining = activeFilterChips(next).map((c) => c.key);
      expect(remaining).toEqual(
        activeFilterChips(full)
          .map((c) => c.key)
          .filter((key) => key !== chip.key)
      );
    }
  });

  it("Clear all resets the search, brand, category and filters but keeps the sort", () => {
    const cleared = { ...full, ...CLEAR_ALL };
    expect(cleared.sort).toBe("name");
    expect(hasActiveParams(cleared)).toBe(false);
    expect(hasActiveParams(full)).toBe(true);
    expect(hasActiveParams(DEFAULT_PARAMS, "typing")).toBe(true);
    expect(hasActiveParams({ ...DEFAULT_PARAMS, category: "Apparel" })).toBe(true);
  });
});
