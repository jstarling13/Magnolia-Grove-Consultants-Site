/**
 * Search-engine helpers for the merchandise storefront: page metadata,
 * JSON-LD structured data and sitemap entries. Pure and framework-free.
 *
 * Everything here works from the slim, customer-facing CatalogProduct and
 * builds its output from an explicit allow-list of fields, so cost, supplier
 * and ESP data can never be carried into public markup even if a richer
 * object is passed in by mistake.
 */

import type { Metadata, MetadataRoute } from "next";
import { brand } from "@/config/siteConfig";
import { categoryPath } from "@/lib/merchSlug";
import { isRealBrand, type CatalogProduct } from "@/lib/merchCatalog";

const META_DESCRIPTION_MAX = 160;

export function absoluteUrl(pathOrUrl: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export function productPath(id: string): string {
  return `/merchandise/${id}`;
}

/**
 * Product copy cleaned for search snippets: whitespace collapsed and the
 * "Priced at N units." tail that the catalog import leaves in descriptions
 * dropped. Optionally cut at a word boundary.
 */
export function cleanDescription(text: string, max?: number): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\s*Priced at [\d,]+ units?\.?\s*$/i, "")
    .trim();
  if (!max || cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "")}…`;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Lowest and highest customer-facing per-unit price across the tiers. */
export function priceRange(product: Pick<CatalogProduct, "tiers">): { low: number; high: number } {
  const prices = product.tiers.map((tier) => tier.price);
  return { low: round2(Math.min(...prices)), high: round2(Math.max(...prices)) };
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

type JsonLd = Record<string, unknown>;

/**
 * schema.org Product with an AggregateOffer over the quantity-break prices.
 *
 * Availability is deliberately omitted. Items are decorated to order with a
 * 2-3 week production run and the store keeps no stock counts, so InStock
 * would be a claim we cannot back, and PreOrder/BackOrder describe items
 * that are not yet released or are out of stock, which is also untrue.
 * Search engines accept an offer without availability.
 *
 * Fields that are never emitted: sku/mpn/gtin (the id is our own slug, and
 * supplier part numbers are backend-only), cost, supplier, ESP data.
 */
export function buildProductJsonLd(product: CatalogProduct, siteUrl: string): JsonLd {
  const url = absoluteUrl(productPath(product.id), siteUrl);
  const { low, high } = priceRange(product);
  const description = cleanDescription(product.description);

  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    url,
  };
  if (description) data.description = description;
  if (product.image) data.image = [absoluteUrl(product.image, siteUrl)];
  if (isRealBrand(product.brand)) data.brand = { "@type": "Brand", name: product.brand.trim() };
  data.category = product.category;
  if (product.colors && product.colors.length > 0) data.color = [...product.colors];
  data.offers = {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: low,
    highPrice: high,
    offerCount: product.tiers.length,
    url,
  };
  return data;
}

export function buildBreadcrumbJsonLd(
  crumbs: { name: string; path: string }[],
  siteUrl: string
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path, siteUrl),
    })),
  };
}

/**
 * JSON for an inline <script type="application/ld+json">. "<" is escaped so
 * a value such as "</script>" can never close the tag early; the line
 * separators U+2028/U+2029 are escaped for older script parsers.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export function buildProductMetadata(product: CatalogProduct, siteUrl: string): Metadata {
  const title = `${product.name} | ${brand.name}`;
  const description =
    cleanDescription(product.description, META_DESCRIPTION_MAX) ||
    `${product.name}, custom-branded merchandise from ${brand.name}.`;
  const url = absoluteUrl(productPath(product.id), siteUrl);
  const image = product.image ? absoluteUrl(product.image, siteUrl) : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: brand.name,
      type: "website",
      ...(image && { images: [{ url: image, alt: product.imageAlt ?? product.name }] }),
    },
    twitter: {
      // Product photos are mostly square, which the large card would crop.
      card: "summary",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export function buildCategoryMetadata(
  category: string,
  products: Pick<CatalogProduct, "tiers">[],
  siteUrl: string
): Metadata {
  const title = `${category} Merchandise | ${brand.name}`;
  const count = products.length;
  const low = count > 0 ? Math.min(...products.map((p) => priceRange(p).low)) : undefined;
  const description =
    count > 0 && low !== undefined
      ? `Browse ${count} custom-branded ${category.toLowerCase()} ${count === 1 ? "item" : "items"} for your campaign or business, with prices from $${low.toFixed(2)} per unit. Preview your logo and order through ${brand.name}.`
      : `Custom-branded ${category.toLowerCase()} for your campaign or business from ${brand.name}.`;
  const url = absoluteUrl(categoryPath(category), siteUrl);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: brand.name, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

export function buildMerchSitemapEntries(
  siteUrl: string,
  categories: readonly string[],
  productIds: readonly string[],
  lastModified: Date = new Date()
): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/merchandise", siteUrl),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...categories.map((name) => ({
      url: absoluteUrl(categoryPath(name), siteUrl),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...productIds.map((id) => ({
      url: absoluteUrl(productPath(id), siteUrl),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
