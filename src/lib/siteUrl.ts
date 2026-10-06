/**
 * Public origin used to build absolute URLs (sitemap, canonical links, Open
 * Graph images, structured data). Same variable and fallback the root layout
 * uses for `metadataBase`, with any trailing slash removed so callers can
 * always append a path that starts with "/".
 */
const FALLBACK_SITE_URL = "https://magnolia-grove-consultants.vercel.app";

// The apex domain redirects (308) to www, so absolute URLs must use www: a canonical or
// sitemap URL that redirects confuses search engines.
const APEX_HOST = "magnoliagrovega.com";

export function normalizeSiteUrl(raw: string | undefined | null): string {
  const value = (raw?.trim() || FALLBACK_SITE_URL).replace(/\/+$/, "");
  try {
    const url = new URL(value);
    if (url.hostname === APEX_HOST) {
      url.hostname = `www.${APEX_HOST}`;
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Not a parseable URL: return it as is, like before.
  }
  return value;
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}
