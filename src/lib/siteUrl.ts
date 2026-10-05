/**
 * Public origin used to build absolute URLs (sitemap, canonical links, Open
 * Graph images, structured data). Same variable and fallback the root layout
 * uses for `metadataBase`, with any trailing slash removed so callers can
 * always append a path that starts with "/".
 */
const FALLBACK_SITE_URL = "https://magnolia-grove-consultants.vercel.app";

export function normalizeSiteUrl(raw: string | undefined | null): string {
  const value = raw?.trim();
  return (value || FALLBACK_SITE_URL).replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}
