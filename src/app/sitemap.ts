import type { MetadataRoute } from "next";
import { pillars } from "@/config/pillarsConfig";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://magnolia-grove-consultants.vercel.app";

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

  return [...staticEntries, ...pillarEntries];
}
