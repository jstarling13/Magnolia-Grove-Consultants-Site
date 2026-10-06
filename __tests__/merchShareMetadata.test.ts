// @vitest-environment node
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { products } from "@/config/merchandiseConfig";
import type { CatalogProduct } from "@/lib/merchCatalog";
import { parseImageSize, readImageSize } from "@/lib/merchImageSize";
import {
  buildProductMetadata,
  buildShareDescription,
  buildShareTitle,
  productShareImagePath,
} from "@/lib/merchSeo";
import { getStorefrontProduct } from "@/lib/merchStorefront";

const SITE = "https://shop.example.com";
const AREA = { top: 50, left: 50, width: 20 };

function make(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "tee-1",
    name: "Cotton Tee",
    category: "Apparel",
    brand: "Nike",
    description: "Soft cotton tee in a classic fit. Priced at 50 units.",
    image: "/images/merch/tee-1.jpg",
    imageAlt: "A cotton tee",
    colors: ["Navy", "Red", "Green"],
    colorImages: { Navy: "/images/merch/colors/tee-1-navy.webp" },
    tiers: [{ quantity: 50, price: 12.5 }],
    imprintArea: AREA,
    ...overrides,
  };
}

const meta = (product: CatalogProduct, size?: { width: number; height: number }) =>
  buildProductMetadata(product, SITE, { imageSize: size ? () => size : undefined }) as any;

describe("share image selection", () => {
  it("is the product's own main photo, absolute and https, with width, height and alt", () => {
    const m = meta(make(), { width: 900, height: 900 });
    expect(m.openGraph.images).toEqual([
      { url: `${SITE}/images/merch/tee-1.jpg`, width: 900, height: 900, alt: "A cotton tee" },
    ]);
    expect(m.openGraph.images[0].url).toMatch(/^https:\/\//);
    expect(m.twitter.card).toBe("summary_large_image");
    expect(m.twitter.images).toEqual([
      { url: `${SITE}/images/merch/tee-1.jpg`, alt: "A cotton tee" },
    ]);
  });

  it("gives each product its own image", () => {
    const a = meta(make({ id: "a", image: "/images/merch/a.webp" }));
    const b = meta(make({ id: "b", image: "/images/merch/b.webp" }));
    expect(a.openGraph.images[0].url).toBe(`${SITE}/images/merch/a.webp`);
    expect(b.openGraph.images[0].url).toBe(`${SITE}/images/merch/b.webp`);
  });

  it("omits width and height when the size is unknown, and uses the name as alt fallback", () => {
    const m = meta(make({ imageAlt: undefined }));
    expect(m.openGraph.images[0]).toEqual({
      url: `${SITE}/images/merch/tee-1.jpg`,
      alt: "Cotton Tee",
    });
  });

  it("never points at the image optimizer or carries query parameters", () => {
    expect(
      productShareImagePath(
        make({ image: "/_next/image?url=%2Fimages%2Fmerch%2Fa.webp&w=640&q=75" }),
        SITE
      )
    ).toBe("/images/merch/a.webp");
    expect(productShareImagePath(make({ image: "/images/merch/a.webp?w=640&q=75#x" }), SITE)).toBe(
      "/images/merch/a.webp"
    );
    const m = meta(make({ image: "/_next/image?url=%2Fimages%2Fmerch%2Fa.webp&w=640&q=75" }));
    expect(JSON.stringify(m)).not.toContain("_next/image");
    expect(JSON.stringify(m)).not.toContain("w=640");
  });

  it("refuses photos hosted elsewhere (a supplier CDN) and unsupported types", () => {
    expect(
      productShareImagePath(make({ image: "https://cdn.supplier.example/a.jpg" }), SITE)
    ).toBeNull();
    expect(
      productShareImagePath(
        make({ image: "/_next/image?url=https%3A%2F%2Fcdn.x.test%2Fa.jpg&w=64" }),
        SITE
      )
    ).toBeNull();
    expect(productShareImagePath(make({ image: "/images/merch/a.avif" }), SITE)).toBeNull();
    expect(productShareImagePath(make({ image: "/images/merch/a.svg" }), SITE)).toBeNull();
    expect(productShareImagePath(make({ image: "images/merch/a.jpg" }), SITE)).toBe(
      "/images/merch/a.jpg"
    );
    expect(productShareImagePath(make({ image: `${SITE}/images/merch/a.jpg` }), SITE)).toBe(
      "/images/merch/a.jpg"
    );
  });

  it("falls back to the branded 1200x630 card for a product with no photo", () => {
    for (const image of [undefined, "", "   ", "https://cdn.supplier.example/a.jpg"]) {
      const m = meta(make({ image }));
      expect(m.openGraph.images).toEqual([
        {
          url: `${SITE}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "Magnolia Grove Consultants",
        },
      ]);
      expect(m.twitter.images[0].url).toBe(`${SITE}/opengraph-image`);
    }
  });
});

describe("share title", () => {
  it("is name, brand and Custom Logo", () => {
    expect(buildShareTitle(make())).toBe("Cotton Tee by Nike - Custom Logo");
  });

  it("does not repeat a brand the name already has, or label an unbranded item", () => {
    expect(buildShareTitle(make({ name: "Nike Dri-FIT Polo" }))).toBe(
      "Nike Dri-FIT Polo - Custom Logo"
    );
    expect(buildShareTitle(make({ brand: "Essentials" }))).toBe("Cotton Tee - Custom Logo");
  });

  it("only claims Custom Logo when the product has an imprint area", () => {
    expect(buildShareTitle({ ...make(), imprintArea: undefined as never })).toBe(
      "Cotton Tee by Nike"
    );
  });

  it("stays within 70 characters by dropping the optional parts, then shortening", () => {
    const mid = make({ name: "A".repeat(30) + " " + "B".repeat(34) });
    expect(buildShareTitle(mid)).toBe(mid.name);
    const long = buildShareTitle(make({ name: "word ".repeat(40).trim() }));
    expect(long.length).toBeLessThanOrEqual(70);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("share description", () => {
  it("is the real description when it says enough, trimmed to 155 characters at a word boundary", () => {
    const long = buildShareDescription(
      make({ description: "Sturdy canvas tote bag. ".repeat(20) })
    );
    expect(long.length).toBeLessThanOrEqual(155);
    expect(long.startsWith("Sturdy canvas tote bag.")).toBe(true);
    expect(long.endsWith("…")).toBe(true);
    const enough =
      "Soft cotton tee in a classic fit with a tagless collar and a double-needle hem.";
    expect(buildShareDescription(make({ description: enough }))).toBe(enough);
  });

  it("composes a description from the product's own fields when the copy is thin", () => {
    expect(buildShareDescription(make())).toBe(
      "Cotton Tee with your logo from Nike. Soft cotton tee in a classic fit. Available in 3 colors. Minimum order 50."
    );
    // unbranded items and names that already carry the brand leave the brand out
    expect(buildShareDescription(make({ brand: "Essentials" }))).toMatch(
      /^Cotton Tee with your logo\. /
    );
    expect(buildShareDescription(make({ name: "Nike Cotton Tee" }))).toMatch(
      /^Nike Cotton Tee with your logo\. /
    );
    // a lone size line is never the whole snippet; one color and no tiers add no sentence
    const sizeOnly = buildShareDescription(
      make({ description: "Size: XS, S, M, L, XL.", colors: ["Navy"], tiers: [] })
    );
    expect(sizeOnly).toBe(
      "Cotton Tee with your logo from Nike. Size: XS, S, M, L, XL. Listed in Apparel."
    );
    // thousands separators in the minimum
    expect(buildShareDescription(make({ tiers: [{ quantity: 1000, price: 1 }] }))).toContain(
      "Minimum order 1,000."
    );
  });

  it("drops the size-pricing boilerplate and the units tail", () => {
    expect(
      buildShareDescription(
        make({
          description:
            "Clear 0.5 oz bottle. Pricing shown is for the base size or option; other sizes or options may cost more. Priced at 96 units.",
        })
      )
    ).toBe(
      "Cotton Tee with your logo from Nike. Clear 0.5 oz bottle. Available in 3 colors. Minimum order 50."
    );
  });

  it("composes from the name, brand, colors and minimum when the description is empty", () => {
    const text = buildShareDescription(make({ description: "Priced at 12 units." }));
    expect(text).toBe(
      "Cotton Tee with your logo from Nike. Available in 3 colors. Minimum order 50."
    );
  });
});

describe("no supplier or ESP terms in preview metadata", () => {
  const FORBIDDEN = /espplus|esp\+|\besp\b|supplier|vendor|wholesale|\bcost\b|margin/i;

  it("holds for every product in the real catalog", () => {
    const titles = new Map<string, string[]>();
    for (const config of products) {
      const slim = getStorefrontProduct(config.id)!;
      const m = buildProductMetadata(slim, SITE, {
        imageSize: () => ({ width: 900, height: 900 }),
      }) as any;
      const text = JSON.stringify(m);
      expect(text, config.id).not.toMatch(FORBIDDEN);
      expect(m.openGraph.title.length, config.id).toBeLessThanOrEqual(70);
      expect(m.openGraph.description.length, config.id).toBeLessThanOrEqual(155);
      expect(m.openGraph.description.length, config.id).toBeGreaterThanOrEqual(70);
      expect(m.description, config.id).toBe(m.openGraph.description);
      expect(m.description, config.id).not.toMatch(/^Size:/i);
      expect(m.description, config.id).not.toMatch(/\bMOQ\b|Priced at|\basi\/|ESP\b/);
      // never ends mid-word: ends in punctuation or the ellipsis the word-boundary cut adds
      expect(m.description, config.id).toMatch(/[.!?"')…]$/);
      expect(m.openGraph.images[0].url, config.id).toMatch(
        new RegExp(`^${SITE}/images/merch/[^?]+\\.(?:webp|jpg)$`)
      );
      expect(m.twitter.card).toBe("summary_large_image");
      titles.set(m.openGraph.title, [...(titles.get(m.openGraph.title) ?? []), config.id]);
    }
    // Names are not guaranteed unique in the catalog data; the titles must be as unique as the names.
    const names = new Set(products.map((p) => getStorefrontProduct(p.id)!.name));
    expect(titles.size).toBeGreaterThanOrEqual(names.size);
  });

  it("points at a photo that exists under public/ for every product", () => {
    const publicDir = path.join(process.cwd(), "public");
    for (const config of products) {
      const slim = getStorefrontProduct(config.id)!;
      const photo = productShareImagePath(slim, SITE);
      expect(photo, config.id).not.toBeNull();
      expect(readImageSize(photo!, publicDir), `${config.id} ${photo}`).toBeDefined();
    }
  });
});

describe("image size reader", () => {
  it("matches sharp for WebP, JPEG and PNG headers", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "og-size-"));
    mkdirSync(path.join(dir, "images"));
    const base = { create: { width: 37, height: 21, channels: 3 as const, background: "#336699" } };
    const files: Record<string, Buffer> = {
      "a.webp": await sharp(base).webp().toBuffer(),
      "b.jpg": await sharp(base).jpeg().toBuffer(),
      "c.png": await sharp(base).png().toBuffer(),
      "d.webp": await sharp(base).webp({ lossless: true }).toBuffer(),
    };
    for (const [name, buf] of Object.entries(files)) {
      writeFileSync(path.join(dir, "images", name), buf);
      expect(readImageSize(`/images/${name}`, dir), name).toEqual({ width: 37, height: 21 });
    }
  });

  it("reads the real merch photos at their true size", async () => {
    const publicDir = path.join(process.cwd(), "public");
    const folder = path.join(publicDir, "images/merch");
    const sample = readdirSync(folder)
      .filter((f) => /\.(webp|jpg)$/.test(f))
      .filter((_, i) => i % 40 === 0);
    expect(sample.length).toBeGreaterThan(20);
    for (const file of sample) {
      const real = await sharp(path.join(folder, file)).metadata();
      expect(readImageSize(`/images/merch/${file}`, publicDir), file).toEqual({
        width: real.width,
        height: real.height,
      });
    }
  });

  it("gives undefined for a missing file, a non-image and a path outside public/", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "og-size-"));
    writeFileSync(path.join(dir, "x.webp"), "not an image");
    expect(readImageSize("/nope.webp", dir)).toBeUndefined();
    expect(readImageSize("/x.webp", dir)).toBeUndefined();
    expect(readImageSize("/../../etc/hosts", dir)).toBeUndefined();
    expect(parseImageSize(Buffer.alloc(8))).toBeUndefined();
  });
});
