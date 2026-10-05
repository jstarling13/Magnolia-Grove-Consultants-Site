import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/siteUrl";

// The storefront (/merchandise, category and product pages) is crawlable;
// only private, transactional and API paths are kept out.
export const DISALLOWED_PATHS = [
  "/api/",
  "/admin",
  "/account",
  "/thank-you",
  "/payment",
  "/merchandise/cart",
  "/merchandise/lookup.json",
  "/merchandise/ids.json",
  "/merchandise/*/cart.json",
  "/merchandise/category/*/cards.json",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
