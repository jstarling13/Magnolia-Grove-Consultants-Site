import type { MetadataRoute } from "next";
import { products } from "@/config/merchandiseConfig";
import { pillars } from "@/config/pillarsConfig";
import { buildMerchSitemapEntries } from "@/lib/merchSeo";
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

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

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
