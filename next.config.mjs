import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Old product ids that no longer have a page (merged into another product by the
// importer's duplicate rules, or dropped) -> the product that replaced them, or a
// category landing page when there is no clear replacement. A value starting with
// "/" is a path; anything else is a live product id. Hidden products are not in
// this map on purpose: they stay 404.
const productRedirects = JSON.parse(
  fs.readFileSync(path.join(__dirname, "src/config/productRedirects.json"), "utf8")
);

// One rule per destination (the old ids that share it are a regex alternation), so
// the list evaluated at the edge stays short. Ids are lowercase letters, digits and
// hyphens, so they are safe inside the pattern. Next also matches the trailing-slash
// variant of every source.
function productRedirectRules() {
  const byDestination = new Map();
  for (const [oldId, target] of Object.entries(productRedirects)) {
    const destination = target.startsWith("/") ? target : `/merchandise/${target}`;
    byDestination.set(destination, [...(byDestination.get(destination) ?? []), oldId]);
  }
  return [...byDestination].map(([destination, oldIds]) => ({
    source: `/merchandise/:oldId(${oldIds.join("|")})`,
    destination,
    permanent: true,
  }));
}

// Next.js dev mode's HMR/React Refresh runtime uses eval() for module
// wrapping — without 'unsafe-eval' here, client components never hydrate
// in `next dev` (production doesn't need eval() and is unaffected).
const isDev = process.env.NODE_ENV !== "production";

// Google Analytics (loaded by @next/third-parties when a measurement id is
// set at build time) needs its own script, beacon, and pixel hosts. They are
// only added when analytics is actually configured, so the default policy
// stays as tight as possible.
const gaEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
const gaScript = gaEnabled ? "https://www.googletagmanager.com" : "";
const gaConnect = gaEnabled
  ? "https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com"
  : "";
const gaImg = gaEnabled
  ? "https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com"
  : "";

// Enforced (not report-only). Reviewed against everything the site loads:
// - Turnstile: script + iframe + verification XHR on challenges.cloudflare.com.
// - Square checkout: the browser is redirected to Square's hosted page by a
//   top-level navigation, which CSP does not restrict (form-action only
//   governs <form> submissions, and the site has none that leave the origin).
// - next/image and next/font: served from 'self' (fonts are self-hosted at
//   build time), blur placeholders use data:.
// - Inline scripts/styles: Next's hydration payload and style attributes need
//   'unsafe-inline'. Removing it requires per-request nonces, which forces
//   every page to render dynamically; that is a larger change than a
//   header tweak, so it is intentionally left out.
// - Logo preview: a data: URL in an <img>, covered by img-src data:.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://challenges.cloudflare.com ${gaScript};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: ${gaImg};
  font-src 'self' data:;
  connect-src 'self' https://challenges.cloudflare.com ${gaConnect};
  frame-src https://challenges.cloudflare.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
`
  .replace(/\s{2,}/g, " ")
  .replace(/\s+;/g, ";")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Production only: browsers ignore HSTS on plain-http localhost anyway, but
  // keeping it out of dev avoids pinning a developer's localhost. Two years,
  // no includeSubDomains/preload: those are irreversible-ish and the owner
  // should opt in deliberately once every subdomain is HTTPS-only.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000" }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // /results predates the full Track Record page and is now a thin
      // subset of it — consolidate SEO authority onto /case-studies.
      { source: "/results", destination: "/case-studies", permanent: true },
      // There is no category index; the catalog lists every category. Without
      // this the URL would be read as a product page with the id "category".
      { source: "/merchandise/category", destination: "/merchandise", permanent: false },
      ...productRedirectRules(),
    ];
  },
};

export default nextConfig;
