import type { MetadataRoute } from "next";
import { products } from "@/config/merchandiseConfig";
import { pillars } from "@/config/pillarsConfig";
import { buildMerchSitemapEntries, resolveLastModified } from "@/lib/merchSeo";
import { getStorefrontCategories } from "@/lib/merchStorefront";
import { getSiteUrl } from "@/lib/siteUrl";

const staticRoutes = [
  "",
  "/services",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/pillars",
  "/case-studies",
  "/booking",
];

/**
 * One timestamp for every <lastmod>, fixed when this module loads (at build
 * time for the static sitemap) rather than on each request. Pages and the
 * product catalog are compiled into the build, so they change only when a new
 * build ships; a per-request date would claim every URL changed every time a
 * crawler fetched the file. Set SITEMAP_LASTMOD (an ISO date) to pin it.
 */
const LAST_MODIFIED = resolveLastModified(process.env.SITEMAP_LASTMOD);

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = LAST_MODIFIED;

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));

  const pillarEntries: MetadataRoute.Sitemap = pillars.map((pillar) => ({
    url: `${siteUrl}/pillars/${pillar.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const merchEntries = buildMerchSitemapEntries(
    siteUrl,
    getStorefrontCategories(),
    products.map((product) => product.id),
    now
  );

  return [...staticEntries, ...pillarEntries, ...merchEntries];
}
