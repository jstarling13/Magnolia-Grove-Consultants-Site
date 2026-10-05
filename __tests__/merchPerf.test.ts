import { afterEach, describe, expect, it, vi } from "vitest";
import { products } from "@/config/merchandiseConfig";
import {
  FILTER_ALL,
  INITIAL_VISIBLE,
  bestTier,
  categoriesNeeded,
  countByCategory,
  firstPerCategory,
  realBrands,
  startingTier,
  toCardProduct,
  type CatalogProduct,
} from "@/lib/merchCatalog";
import { categoryCardsUrl, fetchCategoryCards } from "@/lib/merchCardsClient";
import { categorySlug } from "@/lib/merchSlug";
import {
  getCategoryCards,
  getCategoryCatalog,
  getStorefrontCatalog,
  getStorefrontCategories,
  getStorefrontInitialCatalog,
} from "@/lib/merchStorefront";
import {
  GET,
  generateStaticParams,
} from "@/app/(marketing)/merchandise/category/[slug]/cards.json/route";

function make(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "p",
    name: "Product",
    category: "Apparel",
    brand: "Essentials",
    description: "d",
    tiers: [{ quantity: 25, price: 5 }],
    imprintArea: { top: 50, left: 50, width: 20 },
    ...overrides,
  };
}

describe("toCardProduct", () => {
  const tiers = [
    { quantity: 25, price: 5 },
    { quantity: 50, price: 4.5 },
    { quantity: 100, price: 4 },
    { quantity: 250, price: 3.25 },
  ];

  it("keeps the starting and best tier and drops the ones in between", () => {
    const card = toCardProduct(make({ tiers }));
    expect(card.tiers).toEqual([tiers[0], tiers[3]]);
    expect(startingTier(card)).toEqual(startingTier(make({ tiers })));
    expect(bestTier(card)).toEqual(bestTier(make({ tiers })));
  });

  it("leaves one and two tier products alone, so 'From' and 'As low as' still show", () => {
    expect(toCardProduct(make({ tiers: tiers.slice(0, 1) })).tiers).toHaveLength(1);
    expect(toCardProduct(make({ tiers: tiers.slice(0, 2) })).tiers).toHaveLength(2);
  });

  it("drops an imageAlt that only repeats the name, keeps a different one", () => {
    expect(toCardProduct(make({ imageAlt: "Product" })).imageAlt).toBeUndefined();
    expect(toCardProduct(make({ imageAlt: "A navy polo" })).imageAlt).toBe("A navy polo");
    expect("imageAlt" in toCardProduct(make({ imageAlt: "Product" }))).toBe(false);
  });

  it("does not mutate its input and keeps every other field", () => {
    const input = make({
      tiers,
      colors: ["Red"],
      colorImages: { Red: "/r.webp" },
      image: "/a.webp",
    });
    const copy = structuredClone(input);
    const card = toCardProduct(input);
    expect(input).toEqual(copy);
    expect(card).toMatchObject({
      id: "p",
      colors: ["Red"],
      colorImages: { Red: "/r.webp" },
      image: "/a.webp",
    });
  });
});

describe("catalog helpers", () => {
  const list = [
    make({ id: "a1", category: "Apparel", brand: "Nike" }),
    make({ id: "d1", category: "Drinkware", brand: "Yeti" }),
    make({ id: "a2", category: "Apparel" }),
    make({ id: "a3", category: "Apparel", brand: "Adidas" }),
    make({ id: "d2", category: "Drinkware", brand: "Yeti" }),
  ];

  it("counts per category", () => {
    expect(countByCategory(list)).toEqual({ Apparel: 3, Drinkware: 2 });
    expect(countByCategory([])).toEqual({});
  });

  it("takes the first N of each category in the original order", () => {
    expect(firstPerCategory(list, 2).map((p) => p.id)).toEqual(["a1", "d1", "a2", "d2"]);
    expect(firstPerCategory(list, 0)).toEqual([]);
    expect(firstPerCategory(list, 99)).toHaveLength(5);
  });

  it("lists distinct real brands alphabetically and hides Essentials", () => {
    expect(realBrands(list)).toEqual(["Adidas", "Nike", "Yeti"]);
  });
});

describe("categoriesNeeded", () => {
  const categories = ["Apparel", "Drinkware", "Bags"];
  const base = { category: FILTER_ALL, brand: FILTER_ALL, query: "", sort: "featured" as const };

  it("needs nothing for the default view: the shipped cards are the view", () => {
    expect(categoriesNeeded(base, categories)).toEqual([]);
  });

  it("needs only the focused category when nothing else narrows or reorders", () => {
    expect(categoriesNeeded({ ...base, category: "Drinkware" }, categories)).toEqual(["Drinkware"]);
  });

  it("needs every category for search, brand or sort", () => {
    expect(categoriesNeeded({ ...base, query: "mug" }, categories)).toEqual(categories);
    expect(categoriesNeeded({ ...base, brand: "Nike" }, categories)).toEqual(categories);
    expect(categoriesNeeded({ ...base, sort: "price-asc" }, categories)).toEqual(categories);
    expect(categoriesNeeded({ ...base, category: "Bags", sort: "name" }, categories)).toEqual(
      categories
    );
  });
});

describe("storefront initial catalog", () => {
  const full = getStorefrontCatalog();
  const initial = getStorefrontInitialCatalog();

  it("ships at most the initial number of cards per category", () => {
    const counts = countByCategory(initial.products);
    for (const count of Object.values(counts)) expect(count).toBeLessThanOrEqual(INITIAL_VISIBLE);
    expect(initial.products.length).toBeLessThan(full.products.length);
  });

  it("keeps the featured order of the full catalog", () => {
    const fullOrder = full.products.map((p) => p.id);
    const initialOrder = initial.products.map((p) => p.id);
    expect(initialOrder).toEqual(fullOrder.filter((id) => initialOrder.includes(id)));
    for (const category of initial.categories) {
      const head = full.products.filter((p) => p.category === category).slice(0, INITIAL_VISIBLE);
      expect(initial.products.filter((p) => p.category === category)).toEqual(head);
    }
  });

  it("reports the true size of every category and every brand", () => {
    expect(Object.values(initial.categoryTotals).reduce((a, b) => a + b, 0)).toBe(products.length);
    expect(initial.categories).toEqual(getStorefrontCategories());
    expect(initial.brands).toEqual(realBrands(full.products));
  });

  it("stays slim: no supplier-side data", () => {
    expect(JSON.stringify(initial)).not.toMatch(/espPrice|espUrl|espId|supplier|espplus/i);
  });

  it("does not grow with the catalog: at most N cards per category however many exist", () => {
    const many = Array.from({ length: 10 }, (_, copy) =>
      full.products.map((p) => ({ ...p, id: `${p.id}-${copy}` }))
    ).flat();
    expect(firstPerCategory(many, INITIAL_VISIBLE).length).toBeLessThanOrEqual(
      initial.categories.length * INITIAL_VISIBLE
    );
  });
});

describe("category cards", () => {
  it("covers every product of the category, as cards", () => {
    for (const category of getStorefrontCategories()) {
      const slug = categorySlug(category);
      const cards = getCategoryCards(slug)!;
      const catalog = getCategoryCatalog(slug)!;
      expect(cards.category).toBe(category);
      expect(cards.cards.map((c) => c.id)).toEqual(catalog.products.map((p) => p.id));
      cards.cards.forEach((card, i) => {
        expect(card.tiers.length).toBeLessThanOrEqual(2);
        expect(startingTier(card)).toEqual(startingTier(catalog.products[i]));
        expect(bestTier(card)).toEqual(bestTier(catalog.products[i]));
      });
    }
  });

  it("returns undefined for an unknown slug", () => {
    expect(getCategoryCards("nope")).toBeUndefined();
  });

  it("matches the cards in the initial catalog exactly, so cards do not change when more arrive", () => {
    const initial = getStorefrontInitialCatalog();
    for (const category of initial.categories) {
      const { cards } = getCategoryCards(categorySlug(category))!;
      expect(cards.slice(0, INITIAL_VISIBLE)).toEqual(
        initial.products.filter((p) => p.category === category)
      );
    }
  });
});

describe("cards.json route", () => {
  it("builds one static file per category", () => {
    expect(generateStaticParams()).toEqual(
      getStorefrontCategories().map((category) => ({ slug: categorySlug(category) }))
    );
  });

  it("serves a category's cards as noindex JSON", async () => {
    const category = getStorefrontCategories()[0];
    const response = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ slug: categorySlug(category) }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(response.headers.get("Cache-Control")).toMatch(/max-age=300/);
    const body = (await response.json()) as CatalogProduct[];
    expect(body).toEqual(getCategoryCards(categorySlug(category))!.cards);
  });

  it("404s for an unknown category", async () => {
    const response = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("fetchCategoryCards", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requests the category's cards.json", async () => {
    expect(categoryCardsUrl("Outdoor & Sports")).toBe(
      "/merchandise/category/outdoor-sports/cards.json"
    );
    const cards = [make({ id: "x" })];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(cards)));
    await expect(
      fetchCategoryCards("Apparel", fetchMock as unknown as typeof fetch)
    ).resolves.toEqual(cards);
    expect(fetchMock).toHaveBeenCalledWith("/merchandise/category/apparel/cards.json");
  });

  it("rejects on an HTTP error", async () => {
    const fetchMock = vi.fn(async () => new Response("no", { status: 500 }));
    await expect(
      fetchCategoryCards("Apparel", fetchMock as unknown as typeof fetch)
    ).rejects.toThrow();
  });

  it("rejects on data that is not a list of cards", async () => {
    for (const body of [{}, [{ id: 1 }], [{ id: "a", tiers: [] }], "x"]) {
      const fetchMock = vi.fn(async () => new Response(JSON.stringify(body)));
      await expect(
        fetchCategoryCards("Apparel", fetchMock as unknown as typeof fetch)
      ).rejects.toThrow();
    }
  });
});
