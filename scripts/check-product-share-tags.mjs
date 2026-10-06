#!/usr/bin/env node
/**
 * Run after `next build`. Opens N randomly chosen prerendered product pages
 * (default 20) and fails (exit 1) unless each one carries complete link-preview
 * tags: og:title, og:description, og:image (absolute https or the origin given
 * by --origin, no image-optimizer URL, no query string), og:image:width/height,
 * og:image:alt, twitter:card=summary_large_image, twitter:image and a canonical
 * link. Also checks that the og:image file exists under public/.
 *
 * Usage: node scripts/check-product-share-tags.mjs [--count 20] [--dir .next] [--origin http://localhost:3062]
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const count = Number(arg("--count", "20"));
const nextDir = resolve(arg("--dir", join(root, ".next")));
const origin = arg("--origin", "");
const pageDir = join(nextDir, "server", "app", "merchandise");

if (!existsSync(pageDir)) {
  console.error(`No build output at ${pageDir}. Run \`next build\` first.`);
  process.exit(2);
}

const pages = readdirSync(pageDir)
  .filter((f) => f.endsWith(".html") && !["index.html", "cart.html"].includes(f))
  .map((f) => f.slice(0, -5));
if (pages.length < count) {
  console.error(`Only ${pages.length} product pages found; need ${count}.`);
  process.exit(2);
}
// Fisher-Yates over the full list, then take the first `count`.
for (let i = pages.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [pages[i], pages[j]] = [pages[j], pages[i]];
}

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
function meta(html, attr, key) {
  const re = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`);
  const match = html.match(re);
  return match ? decode(match[1]) : undefined;
}

let failures = 0;
for (const id of pages.slice(0, count)) {
  const html = readFileSync(join(pageDir, `${id}.html`), "utf8");
  const problems = [];
  const get = (key, attr = "property") => meta(html, attr, key);

  for (const key of ["og:title", "og:description", "og:image", "og:image:alt", "og:url"]) {
    if (!get(key)) problems.push(`missing ${key}`);
  }
  for (const key of ["og:image:width", "og:image:height"]) {
    if (!/^\d+$/.test(get(key) ?? "")) problems.push(`missing or non-numeric ${key}`);
  }
  if (get("twitter:card", "name") !== "summary_large_image")
    problems.push("twitter:card is not summary_large_image");
  for (const key of ["twitter:title", "twitter:description", "twitter:image"]) {
    if (!get(key, "name")) problems.push(`missing ${key}`);
  }
  if (!/<link rel="canonical" href="https?:\/\/[^"]+"/.test(html))
    problems.push("missing canonical");

  const title = get("og:title") ?? "";
  const description = get("og:description") ?? "";
  if (title.length > 70) problems.push(`og:title is ${title.length} characters`);
  if (description.length > 155) problems.push(`og:description is ${description.length} characters`);

  const image = get("og:image") ?? "";
  if (image) {
    let url;
    try {
      url = new URL(image);
    } catch {
      problems.push("og:image is not an absolute URL");
    }
    if (url) {
      if (!origin && url.protocol !== "https:") problems.push("og:image is not https");
      if (url.search || url.pathname.startsWith("/_next/"))
        problems.push("og:image has optimizer or query parameters");
      if (!/\.(webp|jpe?g|png)$/i.test(url.pathname) && url.pathname !== "/opengraph-image")
        problems.push("og:image is not a crawler-safe image type");
      if (url.pathname.startsWith("/images/") && !existsSync(join(root, "public", url.pathname)))
        problems.push(`og:image file is missing: ${url.pathname}`);
      if (get("twitter:image", "name") !== image)
        problems.push("twitter:image differs from og:image");
    }
  }
  if (/espplus|supplier|vendor/i.test(`${title} ${description} ${image}`))
    problems.push("supplier term in preview tags");

  if (problems.length) {
    failures += 1;
    console.error(`FAIL ${id}: ${problems.join("; ")}`);
  } else {
    console.log(`ok   ${id}`);
  }
}

if (failures) {
  console.error(`\n${failures} of ${count} product pages are missing share tags.`);
  process.exit(1);
}
console.log(`\nAll ${count} sampled product pages carry complete share tags.`);
