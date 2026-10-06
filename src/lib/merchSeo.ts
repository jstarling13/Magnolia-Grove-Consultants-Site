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
import { SHARE_IMAGE } from "@/app/(marketing)/merchandise/shareImage";
import type { ImageSize } from "@/lib/merchImageSize";
import { categoryPath } from "@/lib/merchSlug";
import { isRealBrand, type CatalogProduct } from "@/lib/merchCatalog";

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
 * Entries of a color list that describe how an item is decorated or sold
 * rather than a color ("Custom (full-color print)", "Assorted", "Any Pms
 * Color", "Full Bleed"). The catalog data should not contain them; this is the
 * safety net for structured data, where a non-color in `color` is wrong.
 */
const NOT_A_COLOR =
  /\b(?:custom|assorted|full[\s-]?colou?r|full[\s-]?bleed|any\s+pms|imprint\w*|sublimat\w*|your\s+(?:logo|design))\b/i;

/** Real colors only, trimmed and without repeats, in their original order. */
export function structuredDataColors(colors: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const color of colors ?? []) {
    const name = color.trim();
    if (!name || NOT_A_COLOR.test(name) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    result.push(name);
  }
  return result;
}

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
  const colors = structuredDataColors(product.colors);
  if (colors.length > 0) data.color = colors;
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

/** Link-preview copy limits: titles stay on one or two lines, descriptions fit a snippet. */
const SHARE_TITLE_MAX = 70;
const SHARE_DESCRIPTION_MAX = 155;
const CUSTOM_LOGO = "Custom Logo";

/** Boilerplate the catalog import adds to size-priced items; it says nothing about the product. */
const PRICING_BOILERPLATE =
  /\s*Pricing shown is for the base size or option; other sizes or options may cost more\.?/gi;

/** Image types every link-preview crawler reads (AVIF and SVG are not among them). */
const CRAWLER_IMAGE_TYPE = /\.(?:jpe?g|png|webp|gif)$/i;

/** Cut at a word boundary, ending in an ellipsis, within `max` characters. */
function shortenAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "")}…`;
}

/**
 * Title for link previews: the product name, then the brand when it is a real
 * name brand the name does not already carry, then "Custom Logo". Every item
 * in the store is ordered with the shopper's logo (each has an imprint area),
 * so "Custom Logo" is true of the whole catalog; it is still tied to that
 * field rather than assumed. The site name is not repeated: og:site_name
 * carries it. The optional parts are dropped, last first, when the title
 * would pass SHARE_TITLE_MAX.
 */
export function buildShareTitle(
  product: Pick<CatalogProduct, "name" | "brand" | "imprintArea">
): string {
  const name = product.name.replace(/\s+/g, " ").trim();
  const brandName = product.brand?.trim() ?? "";
  const byBrand =
    isRealBrand(brandName) && !name.toLowerCase().includes(brandName.toLowerCase())
      ? ` by ${brandName}`
      : "";
  const logo = product.imprintArea ? ` - ${CUSTOM_LOGO}` : "";
  for (const candidate of [`${name}${byBrand}${logo}`, `${name}${byBrand}`, name]) {
    if (candidate.length <= SHARE_TITLE_MAX) return candidate;
  }
  return shortenAtWord(name, SHARE_TITLE_MAX);
}

/** A description shorter than this (or only a size line) is too thin to stand alone as a snippet. */
const SHARE_DESCRIPTION_MIN = 70;
/** How much of the cleaned description the composed fallback quotes. */
const FALLBACK_DESCRIPTION_MAX = 100;

/** Whole sentences up to `max` characters; the first sentence is cut at a word when it is longer. */
function leadingSentences(text: string, max: number): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > max) break;
    out = next;
  }
  if (!out) {
    const cut = text.slice(0, max);
    const space = cut.lastIndexOf(" ");
    out = text.length <= max ? text : space > max * 0.5 ? cut.slice(0, space) : cut;
  }
  return out.replace(/[\s,;:.\-]+$/, "");
}

/**
 * Meta / preview description. A real description that says enough (70+ characters and more than a
 * size line) is used as written, cut at a word to 155. Otherwise one is composed only from the
 * product's own fields: "<Name> with your logo from <Brand>. <start of the description>.
 * Available in N colors. Minimum order X." The brand is left out for unbranded items or when the
 * name already carries it; the color and minimum sentences are the first to go when space runs out.
 */
export function buildShareDescription(
  product: Pick<CatalogProduct, "name" | "brand" | "description"> &
    Partial<Pick<CatalogProduct, "colors" | "tiers" | "category">>
): string {
  const cleaned = cleanDescription(product.description.replace(PRICING_BOILERPLATE, " "));
  if (cleaned.length >= SHARE_DESCRIPTION_MIN && !/^size:/i.test(cleaned)) {
    return shortenAtWord(cleaned, SHARE_DESCRIPTION_MAX);
  }

  const name = product.name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "");
  const brandName = product.brand?.trim() ?? "";
  const byBrand =
    isRealBrand(brandName) && !name.toLowerCase().includes(brandName.toLowerCase())
      ? ` from ${brandName}`
      : "";
  const lead = `${name} with your logo${byBrand}.`;

  const colorCount = new Set((product.colors ?? []).map((c) => c.trim().toLowerCase())).size;
  const colorSentence = colorCount >= 2 ? `Available in ${colorCount} colors.` : "";
  const minimum = product.tiers?.[0]?.quantity;
  const minimumSentence =
    typeof minimum === "number" && minimum > 0
      ? `Minimum order ${minimum.toLocaleString("en-US")}.`
      : "";

  const tails = [colorSentence, minimumSentence].filter(Boolean);
  // drop the last tail sentences first until the description piece has room
  for (let keep = tails.length; keep >= 0; keep--) {
    const kept = tails.slice(0, keep);
    const fixed = [lead, ...kept].join(" ").length;
    const room = Math.min(FALLBACK_DESCRIPTION_MAX, SHARE_DESCRIPTION_MAX - fixed - 1);
    const quote = cleaned && room >= 20 ? leadingSentences(cleaned, room) : "";
    if (cleaned && !quote && keep > 0) continue;
    const body = quote ? `${quote}${/[.!?]$/.test(quote) ? "" : "."}` : "";
    const text = [lead, body, ...kept].filter(Boolean).join(" ");
    if (text.length < SHARE_DESCRIPTION_MIN && product.category?.trim()) {
      // a very short name with little else: the category is a real field and rounds it out
      const withCategory = `${text} Listed in ${product.category.trim()}.`;
      if (withCategory.length <= SHARE_DESCRIPTION_MAX) return withCategory;
    }
    if (text.length <= SHARE_DESCRIPTION_MAX) return text;
  }
  return shortenAtWord(lead, SHARE_DESCRIPTION_MAX);
}

/**
 * Site path of the product photo to use as the share image, or null when the
 * product has none a crawler can fetch. Only the path survives: a photo on
 * another host (a supplier CDN) is refused, a Next image-optimizer URL is
 * unwrapped to the original file, and query strings are dropped, because
 * crawlers reject optimizer parameters and some will not follow redirects.
 */
export function productShareImagePath(
  product: Pick<CatalogProduct, "image">,
  siteUrl: string
): string | null {
  let src = product.image?.trim();
  if (!src) return null;

  try {
    const url = new URL(src, siteUrl);
    if (url.origin !== new URL(siteUrl).origin) return null;
    if (url.pathname === "/_next/image") {
      const inner = url.searchParams.get("url");
      if (!inner) return null;
      const innerUrl = new URL(inner, siteUrl);
      if (innerUrl.origin !== url.origin) return null;
      src = innerUrl.pathname;
    } else {
      src = url.pathname;
    }
  } catch {
    return null;
  }
  return src.startsWith("/") && CRAWLER_IMAGE_TYPE.test(src) ? src : null;
}

export interface ProductMetadataOptions {
  /** Looks up the pixel size of a site path; leave out to omit width/height. */
  imageSize?: (sitePath: string) => ImageSize | undefined;
}

/**
 * Page and link-preview metadata for a product. The preview image is the
 * product's own photo, served from this site; a product without a usable photo
 * falls back to the branded card so a shared link never goes out image-less.
 */
export function buildProductMetadata(
  product: CatalogProduct,
  siteUrl: string,
  options: ProductMetadataOptions = {}
): Metadata {
  const title = `${product.name} | ${brand.name}`;
  const description = buildShareDescription(product);
  const shareTitle = buildShareTitle(product);
  const url = absoluteUrl(productPath(product.id), siteUrl);

  const photoPath = productShareImagePath(product, siteUrl);
  const size = photoPath ? options.imageSize?.(photoPath) : undefined;
  const alt = (product.imageAlt?.trim() || product.name).slice(0, 200);
  const image = photoPath
    ? {
        url: absoluteUrl(photoPath, siteUrl),
        ...(size && { width: size.width, height: size.height }),
        alt,
      }
    : {
        url: absoluteUrl(SHARE_IMAGE.url, siteUrl),
        width: SHARE_IMAGE.width,
        height: SHARE_IMAGE.height,
        alt: SHARE_IMAGE.alt,
      };

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: shareTitle,
      description,
      url,
      siteName: brand.name,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [{ url: image.url, alt: image.alt }],
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

/**
 * The date to publish as <lastmod>: `override` when it parses as a date,
 * otherwise `fallback`. The caller picks a fixed fallback (a build time), never
 * "now" on each request.
 */
export function resolveLastModified(override: string | undefined, fallback = new Date()): Date {
  const parsed = override?.trim() ? new Date(override.trim()) : undefined;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : fallback;
}

export function buildMerchSitemapEntries(
  siteUrl: string,
  categories: readonly string[],
  productIds: readonly string[],
  lastModified: Date
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
