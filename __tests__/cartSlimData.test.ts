// @vitest-environment node
import { describe, expect, it } from "vitest";
import { products } from "@/config/merchandiseConfig";
import {
  GET as getCartJson,
  generateStaticParams,
} from "@/app/(marketing)/merchandise/[id]/cart.json/route";
import { GET as getIdsJson } from "@/app/(marketing)/merchandise/ids.json/route";
import CartPage from "@/app/(marketing)/merchandise/cart/page";
import { toCartProduct, type CatalogProduct } from "@/lib/merchCatalog";
import { getAvailableProductIds, getCartProduct } from "@/lib/merchStorefront";
import { DISALLOWED_PATHS } from "@/app/robots";

const ALLOWED_KEYS = ["brand", "category", "colorImages", "colors", "id", "image", "name", "tiers"];
const ESP_WORDS =
  /espPrice|espUrl|espId|espKind|supplier|\basi\b|productNo|espplus|imprintArea|description/i;

function request(id: string) {
  return getCartJson(new Request(`http://localhost/merchandise/${id}/cart.json`), {
    params: Promise.resolve({ id }),
  });
}

describe("toCartProduct", () => {
  const source: CatalogProduct = {
    id: "p",
    name: "Pen",
    category: "Office & Writing",
    brand: "Essentials",
    description: "long text",
    image: "/i.webp",
    imageAlt: "alt",
    colors: ["Black", "Navy"],
    colorImages: { Black: "/b.webp", Gone: "/g.webp" },
    tiers: [{ quantity: 10, price: 1, espPrice: 0.5 } as never],
    imprintArea: { top: 1, left: 2, width: 3 },
    // Extra fields a careless caller might pass along.
    ...({ espUrl: "https://espplus.com/x", supplier: "S" } as object),
  };

  it("keeps only the fields the cart uses", () => {
    const cart = toCartProduct(source);
    expect(Object.keys(cart).sort()).toEqual([
      "brand",
      "category",
      "colorImages",
      "colors",
      "id",
      "image",
      "name",
      "tiers",
    ]);
    expect(cart.tiers).toEqual([{ quantity: 10, price: 1 }]);
    expect(JSON.stringify(cart)).not.toMatch(ESP_WORDS);
  });

  it("drops photos for colors the product does not list, and empty optional fields", () => {
    expect(toCartProduct(source).colorImages).toEqual({ Black: "/b.webp" });
    const bare = toCartProduct({
      ...source,
      colors: undefined,
      colorImages: undefined,
      image: undefined,
    });
    expect(Object.keys(bare).sort()).toEqual(["brand", "category", "id", "name", "tiers"]);
  });
});

describe("getCartProduct and the cart.json route", () => {
  it("serves every product sold, and nothing else, from generateStaticParams", () => {
    expect(generateStaticParams().map((p) => p.id)).toEqual(products.map((p) => p.id));
    expect(getAvailableProductIds()).toEqual(products.map((p) => p.id));
  });

  it("returns a whitelisted, ESP-free body for every product", async () => {
    for (const product of products) {
      const cart = getCartProduct(product.id)!;
      expect(
        Object.keys(cart).every((key) => ALLOWED_KEYS.includes(key)),
        product.id
      ).toBe(true);
      expect(cart.id).toBe(product.id);
      expect(cart.tiers.length).toBeGreaterThan(0);
      for (const tier of cart.tiers)
        expect(Object.keys(tier).sort()).toEqual(["price", "quantity"]);
      // Photos only for colors the product lists.
      for (const color of Object.keys(cart.colorImages ?? {})) expect(cart.colors).toContain(color);
      expect(JSON.stringify(cart), product.id).not.toMatch(ESP_WORDS);
    }
  });

  it("answers 200 with JSON for a known id, with data-file headers", async () => {
    const id = products[0].id;
    const response = await request(id);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(response.headers.get("cache-control")).toContain("s-maxage");
    const body = await response.json();
    expect(body.id).toBe(id);
    expect(body.name).toBe(products[0].name);
  });

  it("answers 404 for an unknown id", async () => {
    for (const id of ["no-such-product", "", "../etc/passwd", "__proto__"]) {
      expect((await request(id)).status, id).toBe(404);
    }
  });

  it("is small: a product's cart data is a few KB, however big the catalog", async () => {
    const sizes = products.map((p) => JSON.stringify(getCartProduct(p.id)).length);
    expect(Math.max(...sizes)).toBeLessThan(20_000);
  });
});

describe("ids.json route", () => {
  it("lists every product id as plain strings, and nothing else", async () => {
    const response = getIdsJson();
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    const body = await response.json();
    expect(body).toEqual(products.map((p) => p.id));
    expect(body.every((entry: unknown) => typeof entry === "string")).toBe(true);
  });
});

describe("cart page", () => {
  it("ships no catalog in its props", () => {
    const element = CartPage();
    const props = element.props as Record<string, unknown>;
    expect(Object.keys(props).sort()).toEqual(["deliveryEstimate", "pricingDisclaimer"]);
    // Whatever gets serialised for the page is just the two copy strings.
    expect(JSON.stringify(props).length).toBeLessThan(2_000);
  });

  it("keeps the data files out of search results", () => {
    expect(DISALLOWED_PATHS).toEqual(
      expect.arrayContaining(["/merchandise/ids.json", "/merchandise/*/cart.json"])
    );
  });
});
