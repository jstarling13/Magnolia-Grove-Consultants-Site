import { describe, expect, it } from "vitest";
import { products } from "@/config/merchandiseConfig";
import type { CatalogProduct } from "@/lib/merchCatalog";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildCategoryMetadata,
  buildMerchSitemapEntries,
  buildProductJsonLd,
  buildProductMetadata,
  cleanDescription,
  priceRange,
  resolveLastModified,
  serializeJsonLd,
} from "@/lib/merchSeo";
import { getStorefrontProduct } from "@/lib/merchStorefront";
import { normalizeSiteUrl } from "@/lib/siteUrl";

const SITE = "https://shop.example.com";
const AREA = { top: 50, left: 50, width: 20 };

function make(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "tee-1",
    name: "Cotton Tee",
    category: "Apparel",
    brand: "Nike",
    description: "Soft cotton tee. Priced at 50 units.",
    image: "/images/merch/tee-1.jpg",
    imageAlt: "A cotton tee",
    colors: ["Navy", "Red"],
    tiers: [
      { quantity: 50, price: 12.5 },
      { quantity: 100, price: 10.25 },
      { quantity: 500, price: 8 },
    ],
    imprintArea: AREA,
    ...overrides,
  };
}

describe("normalizeSiteUrl / absoluteUrl", () => {
  it("falls back, trims and strips trailing slashes", () => {
    expect(normalizeSiteUrl(undefined)).toMatch(/^https:\/\//);
    expect(normalizeSiteUrl("")).toMatch(/^https:\/\//);
    expect(normalizeSiteUrl(" https://a.com/// ")).toBe("https://a.com");
  });

  it("joins paths and leaves absolute URLs alone", () => {
    expect(absoluteUrl("/x/y", SITE)).toBe(`${SITE}/x/y`);
    expect(absoluteUrl("x", SITE)).toBe(`${SITE}/x`);
    expect(absoluteUrl("https://cdn.test/a.jpg", SITE)).toBe("https://cdn.test/a.jpg");
  });
});

describe("cleanDescription", () => {
  it("drops the import's 'Priced at N units.' tail and collapses whitespace", () => {
    expect(cleanDescription("Mug  with\nlid. Priced at 100 units.")).toBe("Mug with lid.");
    expect(cleanDescription("Priced at 12 units.")).toBe("");
    expect(cleanDescription("Priced at the top of its class.")).toBe(
      "Priced at the top of its class."
    );
  });

  it("truncates at a word boundary within the limit", () => {
    const long = "word ".repeat(80).trim();
    const out = cleanDescription(long, 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/);
  });
});

describe("priceRange", () => {
  it("is order-independent", () => {
    expect(
      priceRange({
        tiers: [
          { quantity: 1, price: 9 },
          { quantity: 2, price: 3.456 },
        ],
      })
    ).toEqual({
      low: 3.46,
      high: 9,
    });
  });
});

describe("buildProductJsonLd", () => {
  const ld = buildProductJsonLd(make(), SITE) as Record<string, any>;

  it("describes the product with absolute URLs", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("Cotton Tee");
    expect(ld.description).toBe("Soft cotton tee.");
    expect(ld.image).toEqual([`${SITE}/images/merch/tee-1.jpg`]);
    expect(ld.url).toBe(`${SITE}/merchandise/tee-1`);
    expect(ld.category).toBe("Apparel");
    expect(ld.color).toEqual(["Navy", "Red"]);
    expect(ld.brand).toEqual({ "@type": "Brand", name: "Nike" });
  });

  it("emits an AggregateOffer from customer prices with lowPrice <= highPrice", () => {
    expect(ld.offers).toMatchObject({
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: 8,
      highPrice: 12.5,
      offerCount: 3,
    });
    expect(ld.offers.lowPrice).toBeLessThanOrEqual(ld.offers.highPrice);
  });

  it("does not claim availability", () => {
    expect(JSON.stringify(ld)).not.toMatch(/availability|InStock|PreOrder/i);
  });

  it("omits the brand for generic Essentials and omits empty colors and image", () => {
    const generic = buildProductJsonLd(
      make({ brand: "Essentials", colors: undefined, image: undefined }),
      SITE
    );
    expect(generic).not.toHaveProperty("brand");
    expect(generic).not.toHaveProperty("color");
    expect(generic).not.toHaveProperty("image");
  });

  it("leaves non-colors out of the color array and keeps real ones", () => {
    const withJunk = buildProductJsonLd(
      make({
        colors: [
          "Navy",
          "Custom (full-color print)",
          "Assorted",
          "Any Pms Color",
          "Full Bleed",
          "Gray (Pms Cool Gray 8C)",
          "Multi Color",
          "navy",
        ],
      }),
      SITE
    ) as Record<string, any>;
    expect(withJunk.color).toEqual(["Navy", "Gray (Pms Cool Gray 8C)", "Multi Color"]);
  });

  it("omits the color property when every entry is a non-color", () => {
    const only = buildProductJsonLd(make({ colors: ["Custom (full-color print)"] }), SITE);
    expect(only).not.toHaveProperty("color");
  });

  it("handles a single-tier product", () => {
    const single = buildProductJsonLd(
      make({ tiers: [{ quantity: 1, price: 56.02 }] }),
      SITE
    ) as any;
    expect(single.offers.lowPrice).toBe(56.02);
    expect(single.offers.highPrice).toBe(56.02);
    expect(single.offers.offerCount).toBe(1);
  });

  it("never carries cost, supplier or part-number data, even from a richer object", () => {
    const tainted = {
      ...make(),
      supplier: "ACME SUPPLY",
      productNo: "SKU-99",
      espId: "123456789",
      espUrl: "https://espplus.com/products/1",
      cost: 3,
      tiers: [{ quantity: 50, price: 12.5, espPrice: 4.1 }],
    } as unknown as CatalogProduct;
    const text = JSON.stringify(buildProductJsonLd(tainted, SITE));
    expect(text).not.toMatch(/esp|supplier|productNo|SKU-99|ACME|cost|4\.1|sku|mpn/i);
  });

  it("is clean for every product in the real catalog", () => {
    for (const source of products) {
      const slim = getStorefrontProduct(source.id)!;
      const data = buildProductJsonLd(slim, SITE) as any;
      expect(data.offers.lowPrice).toBeLessThanOrEqual(data.offers.highPrice);
      expect(data.offers.offerCount).toBe(source.priceTiers.length);
      // The only prices present are the customer-facing ones.
      const customerPrices = new Set(source.priceTiers.map((t) => t.price));
      expect(customerPrices.has(data.offers.lowPrice)).toBe(true);
      expect(customerPrices.has(data.offers.highPrice)).toBe(true);
      expect(JSON.stringify(data)).not.toMatch(/espplus|espPrice|supplier|productNo/i);
    }
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so a value cannot close the script tag", () => {
    const out = serializeJsonLd(
      buildProductJsonLd(make({ name: "</script><img src=x onerror=1>" }), SITE)
    );
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script>");
    expect(JSON.parse(out).name).toBe("</script><img src=x onerror=1>");
  });

  it("escapes the JS line separators and stays valid JSON", () => {
    const out = serializeJsonLd({ a: "x\u2028y\u2029z" });
    expect(out).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(out).a).toBe("x\u2028y\u2029z");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("numbers items from 1 with absolute URLs", () => {
    const ld = buildBreadcrumbJsonLd(
      [
        { name: "Merchandise", path: "/merchandise" },
        { name: "Apparel", path: "/merchandise/category/apparel" },
      ],
      SITE
    ) as any;
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement.map((i: any) => [i.position, i.item])).toEqual([
      [1, `${SITE}/merchandise`],
      [2, `${SITE}/merchandise/category/apparel`],
    ]);
  });
});

describe("buildProductMetadata", () => {
  const meta = buildProductMetadata(make(), SITE) as any;

  it("sets title, description and canonical", () => {
    expect(meta.title).toBe("Cotton Tee | Magnolia Grove Consultants");
    expect(meta.description).toBe(
      "Cotton Tee with your logo from Nike. Soft cotton tee. Available in 2 colors. Minimum order 50."
    );
    expect(meta.alternates.canonical).toBe(`${SITE}/merchandise/tee-1`);
  });

  it("uses the absolute product photo for Open Graph and Twitter", () => {
    const image = `${SITE}/images/merch/tee-1.jpg`;
    expect(meta.openGraph.images).toEqual([{ url: image, alt: "A cotton tee" }]);
    expect(meta.openGraph.url).toBe(`${SITE}/merchandise/tee-1`);
    expect(meta.twitter.images).toEqual([{ url: image, alt: "A cotton tee" }]);
  });

  it("falls back to a generated description and the branded card when there is no photo", () => {
    const bare = buildProductMetadata(make({ description: "", image: undefined }), SITE) as any;
    expect(bare.description).toContain("Cotton Tee");
    expect(bare.openGraph.images[0].url).toBe(`${SITE}/opengraph-image`);
    expect(bare.twitter.images[0].url).toBe(`${SITE}/opengraph-image`);
  });

  it("keeps descriptions within search-snippet length", () => {
    const long = buildProductMetadata(make({ description: "word ".repeat(200) }), SITE) as any;
    expect(long.description.length).toBeLessThanOrEqual(155);
  });
});

describe("buildCategoryMetadata", () => {
  it("summarizes the category from its products", () => {
    const meta = buildCategoryMetadata(
      "Outdoor & Sports",
      [make(), make({ id: "x" })],
      SITE
    ) as any;
    expect(meta.title).toBe("Outdoor & Sports Merchandise | Magnolia Grove Consultants");
    expect(meta.description).toContain("2 custom-branded outdoor & sports items");
    expect(meta.description).toContain("$8.00");
    expect(meta.alternates.canonical).toBe(`${SITE}/merchandise/category/outdoor-sports`);
  });

  it("does not fail on an empty category", () => {
    expect(() => buildCategoryMetadata("Apparel", [], SITE)).not.toThrow();
  });
});

describe("resolveLastModified", () => {
  const fallback = new Date("2026-03-01T12:00:00Z");

  it("uses a valid override and ignores a blank or unparseable one", () => {
    expect(resolveLastModified("2026-02-01", fallback).toISOString()).toBe(
      "2026-02-01T00:00:00.000Z"
    );
    expect(resolveLastModified(undefined, fallback)).toBe(fallback);
    expect(resolveLastModified("  ", fallback)).toBe(fallback);
    expect(resolveLastModified("not a date", fallback)).toBe(fallback);
  });
});

describe("structured data for the real catalog", () => {
  it("never lists a decoration option as a color", () => {
    for (const config of products) {
      const slim = getStorefrontProduct(config.id)!;
      const ld = buildProductJsonLd(slim, SITE) as Record<string, unknown>;
      for (const color of (ld.color as string[] | undefined) ?? []) {
        expect(color, config.id).not.toMatch(/custom|full[\s-]?colou?r|assorted|full[\s-]?bleed/i);
      }
    }
  });
});

describe("buildMerchSitemapEntries", () => {
  const stamp = new Date("2026-01-15T00:00:00Z");
  const entries = buildMerchSitemapEntries(
    SITE,
    ["Apparel", "Outdoor & Sports"],
    ["a", "b"],
    stamp
  );
  const urls = entries.map((e) => e.url);

  it("stamps every entry with the date it is given, never the current time", () => {
    for (const entry of entries) expect(entry.lastModified).toBe(stamp);
  });

  it("lists the catalog, every category and every product", () => {
    expect(urls).toEqual([
      `${SITE}/merchandise`,
      `${SITE}/merchandise/category/apparel`,
      `${SITE}/merchandise/category/outdoor-sports`,
      `${SITE}/merchandise/a`,
      `${SITE}/merchandise/b`,
    ]);
  });
});
