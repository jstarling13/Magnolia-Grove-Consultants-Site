import { brand } from "@/config/siteConfig";

/**
 * The branded card from src/app/opengraph-image.tsx. A page that sets its own
 * openGraph/twitter metadata replaces the inherited one, image included, so
 * the storefront pages name it explicitly (resolved against metadataBase).
 */
export const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: brand.name,
};
