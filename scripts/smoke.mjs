#!/usr/bin/env node
/**
 * Post-deploy smoke test for the Magnolia Grove merchandise store.
 *
 *   npm run smoke -- [base-url] [flags]
 *
 * Runs READ-ONLY checks against a deployed site (default https://www.magnoliagrovega.com),
 * prints a PASS/FAIL table and a final HEALTHY or PROBLEM line, and exits 1 on any FAIL.
 * Dependency-free: Node 18+ global fetch only. See docs/SMOKE.md for the full list of checks.
 *
 * Flags:
 *   --json              machine-readable report on stdout (human table suppressed)
 *   --sample N          product pages to sample from the sitemap (default 40)
 *   --seed N            seed for the sampler (default: random, printed so a run can be repeated)
 *   --min-sitemap N     minimum number of sitemap URLs (default 800)
 *   --probe-webhook     opt in to the single POST: an unsigned empty POST to /api/webhooks/square
 *   --timeout MS        per-request timeout (default 15000)
 *   --help              usage
 *
 * Exit codes: 0 healthy, 1 at least one FAIL, 2 bad usage.
 *
 * Safety: every request is a GET, with one exception (the webhook probe, opt-in). The image
 * check is a GET whose body is cancelled after the headers arrive rather than a HEAD, so that
 * the webhook POST stays the only non-GET request. Requests are spaced to at most 5 per second
 * and identify as "mg-smoke/1.0".
 *
 * The helpers exported below are pure (no network) and covered by __tests__/smoke*.test.ts.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const DEFAULT_BASE_URL = "https://www.magnoliagrovega.com";
export const USER_AGENT = "mg-smoke/1.0";
export const MAX_RPS = 5;
export const DEFAULT_SAMPLE = 40;
export const DEFAULT_MIN_SITEMAP = 800;
export const DEFAULT_TIMEOUT_MS = 15000;
export const WARN_BYTES = 300 * 1024;
export const WARN_MS = 3000;
export const WEBHOOK_PATH = "/api/webhooks/square";
export const ROBOTS_REQUIRED_DISALLOWS = ["/api/", "/admin", "/orders", "/merchandise/cart"];
const IMAGE_WIDTH = 640;

/* ------------------------------------------------------------------------------------------ */
/* Pure helpers                                                                               */
/* ------------------------------------------------------------------------------------------ */

/** Decode the five predefined XML entities plus numeric references. */
export function decodeEntities(text) {
  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Parse a sitemap.xml body. Returns every <loc> as a trimmed, entity-decoded string. `isIndex`
 * is true for a <sitemapindex> (its <loc>s are other sitemaps, not pages).
 */
export function parseSitemap(xml) {
  const body = String(xml ?? "");
  const urls = [];
  const re = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
  let match;
  while ((match = re.exec(body)) !== null) {
    const loc = decodeEntities(match[1]).trim();
    if (loc) urls.push(loc);
  }
  return { urls, isIndex: /<sitemapindex[\s>]/i.test(body) };
}

/** Path plus query of an absolute URL or path; null if it cannot be parsed. */
export function toPath(urlOrPath) {
  try {
    const url = new URL(urlOrPath, "http://placeholder.invalid");
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

/**
 * Split sitemap URLs into category landing pages and product pages. Only the path is kept, so
 * the checks run against whatever origin is being tested even when the sitemap advertises a
 * different canonical host (the sitemap lists the apex domain; www is what actually serves).
 */
export function classifySitemapUrls(urls) {
  const categories = [];
  const products = [];
  const seen = new Set();
  for (const raw of urls) {
    const path = toPath(raw);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const pathname = path.split("?")[0].replace(/\/+$/, "");
    if (/^\/merchandise\/category\/[^/]+$/.test(pathname)) {
      categories.push(pathname);
    } else if (/^\/merchandise\/[^/]+$/.test(pathname)) {
      const slug = pathname.slice("/merchandise/".length);
      if (slug === "cart" || slug === "category" || slug.includes(".")) continue;
      products.push(pathname);
    }
  }
  return { categories, products };
}

/** Small deterministic PRNG (mulberry32): the same seed always yields the same sequence. */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** n distinct items drawn without replacement (partial Fisher-Yates). Input is not mutated. */
export function sampleSeeded(items, n, seed) {
  const pool = [...items];
  const count = Math.max(0, Math.min(Math.floor(n), pool.length));
  const rng = createRng(seed);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/** Every <script type="application/ld+json"> block, parsed. Never throws. */
export function extractJsonLd(html) {
  const blocks = [];
  let errors = 0;
  const re = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(String(html ?? ""))) !== null) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      errors += 1;
    }
  }
  return { blocks, errors };
}

/** The set of schema.org @type values found in parsed JSON-LD blocks (handles @graph and arrays). */
export function jsonLdTypes(blocks) {
  const types = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const type = node["@type"];
    if (typeof type === "string") types.add(type);
    else if (Array.isArray(type)) type.forEach((t) => typeof t === "string" && types.add(t));
    if (node["@graph"]) visit(node["@graph"]);
  };
  visit(blocks);
  return types;
}

export function extractTitle(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html ?? ""));
  return match ? decodeEntities(match[1]).trim() : "";
}

/** True when the page has an <h1> with visible text. */
export function hasH1(html) {
  const re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  let match;
  while ((match = re.exec(String(html ?? ""))) !== null) {
    if (match[1].replace(/<[^>]*>/g, "").trim()) return true;
  }
  return false;
}

/** True when the page carries a price table or at least one $ amount. */
export function hasPrice(html) {
  const body = String(html ?? "");
  return /<table\b/i.test(body) || /\$\s?\d[\d,]*(?:\.\d{2})?/.test(body);
}

/**
 * The product photo's src. Prefers images served from /images/merch/ (so the header logo is
 * skipped), then falls back to the first <img> that is not obviously a logo. Null if none.
 */
export function pickProductImage(html) {
  const srcs = [];
  const re = /<img\b[^>]*>/gi;
  let tag;
  while ((tag = re.exec(String(html ?? ""))) !== null) {
    const src = /\bsrc\s*=\s*"([^"]*)"/i.exec(tag[0]) ?? /\bsrc\s*=\s*'([^']*)'/i.exec(tag[0]);
    if (src && src[1]) srcs.push(decodeEntities(src[1]));
  }
  const decoded = (s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  const merch = srcs.find((s) => decoded(s).includes("/images/merch/"));
  if (merch) return merch;
  return srcs.find((s) => !/logo/i.test(decoded(s)) && !s.startsWith("data:")) ?? null;
}

/**
 * Next's image optimizer URL for the full-size hero asks for w=3840, which is expensive to
 * generate on a cold cache. Re-point it at a width the page's own srcset already uses.
 */
export function shrinkNextImage(src, width = IMAGE_WIDTH) {
  if (!/^\/_next\/image\?/.test(src)) return src;
  return /([?&])w=\d+/.test(src) ? src.replace(/([?&])w=\d+/, `$1w=${width}`) : `${src}&w=${width}`;
}

/** Inspect one product page and list what is missing. Pure: takes the HTML string. */
export function analyzeProductPage(html) {
  const title = extractTitle(html);
  const ld = extractJsonLd(html);
  const checks = {
    title: title.length > 0 && !/not found/i.test(title),
    h1: hasH1(html),
    price: hasPrice(html),
    img: pickProductImage(html) !== null,
    jsonld: ld.blocks.length > 0 && ld.errors === 0,
  };
  return { checks, title, image: pickProductImage(html), jsonLdBlocks: ld.blocks.length };
}

/** Product links on the /merchandise index: /merchandise/<slug>, minus cart/category/json files. */
export function extractProductLinks(html) {
  const found = new Set();
  const re = /href="\/merchandise\/([^/"#?]+)[#?"]/g;
  let match;
  while ((match = re.exec(String(html ?? ""))) !== null) {
    const slug = match[1];
    if (slug === "cart" || slug === "category" || slug.includes(".")) continue;
    found.add(slug);
  }
  return [...found];
}

/** Disallow rules that apply to `User-agent: *`. */
export function parseRobotsDisallows(text) {
  const rules = [];
  let applies = false;
  let groupHasRules = false;
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      // Consecutive user-agent lines form one group; a rule line ends the group header.
      if (groupHasRules) {
        applies = false;
        groupHasRules = false;
      }
      if (value === "*") applies = true;
    } else if (field === "disallow") {
      groupHasRules = true;
      if (applies && value) rules.push(value);
    } else if (field === "allow") {
      groupHasRules = true;
    }
  }
  return rules;
}

/** Which of `required` paths are not covered by a Disallow rule, and whether everything is blocked. */
export function checkRobots(text, required = ROBOTS_REQUIRED_DISALLOWS) {
  const rules = parseRobotsDisallows(text);
  const missing = required.filter((path) => !rules.some((rule) => path.startsWith(rule)));
  const blocksEverything = rules.includes("/");
  return { rules, missing, blocksEverything };
}

/* ---- classifiers: status code (+ headers) in, { status, detail } out ------------------------ */

export function classifyAdmin(status, location) {
  if (status === 200) return { status: "FAIL", detail: "200: admin content is publicly reachable" };
  if (status >= 300 && status < 400) {
    return /login|sign-?in|auth/i.test(location ?? "")
      ? { status: "PASS", detail: `${status} to ${shortLocation(location)}` }
      : { status: "WARN", detail: `${status} to ${shortLocation(location)} (not a login page)` };
  }
  if (status === 401 || status === 403 || status === 404) {
    return { status: "PASS", detail: `${status}` };
  }
  if (status === 0) return { status: "FAIL", detail: "request failed" };
  return { status: status >= 500 ? "FAIL" : "WARN", detail: `unexpected ${status}` };
}

export function classifyWebhook(status) {
  if (status === 503) {
    return {
      status: "FAIL",
      detail: "503: webhook environment variables are missing on the deployment",
    };
  }
  if (status === 400 || status === 401 || status === 403) {
    return { status: "PASS", detail: `${status}: unsigned request rejected` };
  }
  if (status >= 200 && status < 300) {
    return { status: "FAIL", detail: `${status}: unsigned request was accepted` };
  }
  if (status === 0) return { status: "FAIL", detail: "request failed" };
  return { status: status >= 500 ? "FAIL" : "WARN", detail: `unexpected ${status}` };
}

/** Apex request result (manual redirect) relative to the www host. */
export function classifyApex(status, location, wwwHost) {
  if (status === 0)
    return { status: "WARN", detail: "apex host unreachable", redirectsToWww: false };
  if (status >= 300 && status < 400) {
    let host = "";
    try {
      host = new URL(location ?? "", "http://placeholder.invalid").hostname;
    } catch {
      host = "";
    }
    if (host === wwwHost) {
      return {
        status: "PASS",
        detail: `apex redirects to ${wwwHost} (${status})`,
        redirectsToWww: true,
      };
    }
    return {
      status: "WARN",
      detail: `apex redirects (${status}) to ${shortLocation(location)}, not ${wwwHost}`,
      redirectsToWww: false,
    };
  }
  return {
    status: "WARN",
    detail: `apex answers ${status} without redirecting to ${wwwHost}`,
    redirectsToWww: false,
  };
}

export function classifyPerf(bytes, ms) {
  const problems = [];
  if (bytes > WARN_BYTES) problems.push(`over ${Math.round(WARN_BYTES / 1024)} KB`);
  if (ms > WARN_MS) problems.push(`over ${WARN_MS / 1000}s`);
  return {
    status: problems.length ? "WARN" : "PASS",
    detail: `${formatBytes(bytes)} in ${Math.round(ms)} ms${problems.length ? ` (${problems.join(", ")})` : ""}`,
  };
}

function shortLocation(location) {
  if (!location) return "(no Location header)";
  try {
    const url = new URL(location, "http://placeholder.invalid");
    return url.hostname === "placeholder.invalid"
      ? url.pathname + url.search
      : `${url.origin}${url.pathname}`;
  } catch {
    return location;
  }
}

/* ---- request policy and politeness ---------------------------------------------------------- */

/** The only non-GET request the script may ever make: the opt-in unsigned webhook probe. */
export function isRequestAllowed(method, pathname, probeWebhook) {
  if (method === "GET") return true;
  return method === "POST" && probeWebhook === true && pathname === WEBHOOK_PATH;
}

/**
 * Spaces request starts so they never exceed `rps` per second. `now` and `sleep` are injectable
 * so tests can run on a fake clock.
 */
export function createLimiter(rps, { now = () => Date.now(), sleep = defaultSleep } = {}) {
  const rate = Math.min(Math.max(rps, 0.1), MAX_RPS);
  const gap = 1000 / rate;
  let nextSlot = 0;
  return async function wait() {
    const current = now();
    const start = Math.max(current, nextSlot);
    nextSlot = start + gap;
    if (start > current) await sleep(start - current);
  };
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---- arguments and base URL ---------------------------------------------------------------- */

export function parseArgs(argv) {
  const opts = {
    base: DEFAULT_BASE_URL,
    json: false,
    sample: DEFAULT_SAMPLE,
    seed: null,
    minSitemap: DEFAULT_MIN_SITEMAP,
    probeWebhook: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    help: false,
    error: null,
  };
  const intFlag = (name, value, min) => {
    const n = Number(value);
    if (value === undefined || !Number.isInteger(n) || n < min) {
      opts.error = `${name} needs an integer >= ${min}`;
      return null;
    }
    return n;
  };
  let baseSet = false;
  for (let i = 0; i < argv.length && !opts.error; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.startsWith("--") ? arg.split(/=(.*)/s, 2) : [arg, undefined];
    const takeValue = () => (inline !== undefined ? inline : argv[++i]);
    switch (flag) {
      case "--json":
        opts.json = true;
        break;
      case "--probe-webhook":
        opts.probeWebhook = true;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      case "--sample": {
        const n = intFlag("--sample", takeValue(), 0);
        if (n !== null) opts.sample = n;
        break;
      }
      case "--seed": {
        const n = intFlag("--seed", takeValue(), 0);
        if (n !== null) opts.seed = n;
        break;
      }
      case "--min-sitemap": {
        const n = intFlag("--min-sitemap", takeValue(), 0);
        if (n !== null) opts.minSitemap = n;
        break;
      }
      case "--timeout": {
        const n = intFlag("--timeout", takeValue(), 1);
        if (n !== null) opts.timeoutMs = n;
        break;
      }
      default:
        if (arg.startsWith("-")) opts.error = `unknown flag ${arg}`;
        else if (baseSet) opts.error = `unexpected argument ${arg}`;
        else {
          opts.base = arg;
          baseSet = true;
        }
    }
  }
  if (!opts.error) {
    const normalized = normalizeBaseUrl(opts.base);
    if (normalized) opts.base = normalized;
    else opts.error = `invalid base URL ${opts.base}`;
  }
  return opts;
}

/** Add a scheme if missing (http for localhost, https otherwise) and strip path/trailing slash. */
export function normalizeBaseUrl(input) {
  let value = String(input ?? "").trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    value = `${/^(localhost|127\.|\[::1\])/i.test(value) ? "http" : "https"}://${value}`;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** { apex, www } hostnames for a base URL, or null for localhost, IPs and deeper subdomains. */
export function apexWwwPair(base) {
  let host;
  try {
    host = new URL(base).hostname;
  } catch {
    return null;
  }
  if (host === "localhost" || /^[\d.]+$/.test(host) || host.includes(":")) return null;
  if (host.startsWith("www.")) return { apex: host.slice(4), www: host };
  return host.split(".").length === 2 ? { apex: host, www: `www.${host}` } : null;
}

/* ---- results and formatting ----------------------------------------------------------------- */

export function summarize(results) {
  const counts = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return { ...counts, healthy: counts.FAIL === 0 };
}

export function formatBytes(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

/** "a, b, c (+4 more)". */
export function listSome(items, max = 3) {
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown} (+${items.length - max} more)` : shown;
}

/** Fixed-width PASS/FAIL table. */
export function formatTable(results) {
  const rows = results.map((r) => [r.status, r.check, r.detail ?? ""]);
  const headers = ["STATUS", "CHECK", "DETAIL"];
  const widths = headers.map((h, col) => Math.max(h.length, ...rows.map((row) => row[col].length)));
  const line = (cells) =>
    cells
      .map((cell, col) => (col === cells.length - 1 ? cell : cell.padEnd(widths[col])))
      .join("  ")
      .trimEnd();
  const rule = widths.map((w) => "-".repeat(w)).join("  ");
  return [line(headers), rule, ...rows.map(line)].join("\n");
}

export function formatVerdict(results) {
  const s = summarize(results);
  const tally = `${s.PASS} passed, ${s.FAIL} failed, ${s.WARN} warnings, ${s.SKIP} skipped`;
  return s.healthy ? `HEALTHY (${tally})` : `PROBLEM (${tally})`;
}

export function formatReport(report) {
  const header = [
    `mg-smoke ${report.base}`,
    `sample ${report.sample} of ${report.sitemapProducts ?? "?"} products, seed ${report.seed}, ` +
      `${report.requests.total} requests (${report.requests.nonGet} non-GET)`,
  ].join("\n");
  return `${header}\n\n${formatTable(report.results)}\n\n${formatVerdict(report.results)}`;
}

export function buildJsonReport(report) {
  const s = summarize(report.results);
  return {
    base: report.base,
    healthy: s.healthy,
    counts: { pass: s.PASS, fail: s.FAIL, warn: s.WARN, skip: s.SKIP },
    seed: report.seed,
    sample: report.sample,
    durationMs: report.durationMs,
    requests: report.requests,
    results: report.results.map(({ order, ...rest }) => rest),
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Runner (network)                                                                           */
/* ------------------------------------------------------------------------------------------ */

function createClient(opts) {
  const limiter = createLimiter(MAX_RPS);
  const stats = { total: 0, nonGet: 0 };

  async function once(url, init, readBody) {
    await limiter();
    stats.total += 1;
    if (init.method !== "GET") stats.nonGet += 1;
    const started = performance.now();
    const res = await fetch(url, {
      ...init,
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
    const out = {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      location: res.headers.get("location") ?? "",
      text: "",
      bytes: 0,
      ms: 0,
      error: null,
    };
    if (readBody) {
      const buf = Buffer.from(await res.arrayBuffer());
      out.bytes = buf.length;
      out.text = buf.toString("utf8");
    } else {
      // Headers are all that is needed; drop the body without downloading it.
      await res.body?.cancel().catch(() => {});
    }
    out.ms = performance.now() - started;
    return out;
  }

  /** Guarded request. Network errors become status 0 (GETs are retried once). */
  async function request(origin, path, { method = "GET", readBody = true, headers, body } = {}) {
    const pathname = path.split("?")[0];
    if (!isRequestAllowed(method, pathname, opts.probeWebhook)) {
      throw new Error(
        `refusing ${method} ${pathname}: only the opt-in webhook probe may be non-GET`
      );
    }
    const init = { method, headers, body };
    const attempts = method === "GET" ? 2 : 1;
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await once(`${origin}${path}`, init, readBody);
      } catch (err) {
        lastError = err;
      }
    }
    const reason = lastError?.cause?.code ?? lastError?.name ?? "error";
    return {
      status: 0,
      contentType: "",
      location: "",
      text: "",
      bytes: 0,
      ms: 0,
      error: `${reason}: ${lastError?.message ?? ""}`.trim(),
    };
  }

  return { request, stats };
}

function readHiddenIds() {
  try {
    const url = new URL("../src/config/hiddenProducts.json", import.meta.url);
    const parsed = JSON.parse(readFileSync(url, "utf8"));
    const ids = Array.isArray(parsed) ? parsed : Object.keys(parsed);
    return ids.filter((id) => typeof id === "string" && id);
  } catch {
    return null;
  }
}

export async function runSmoke(opts, { log = () => {} } = {}) {
  const startedAt = performance.now();
  const client = createClient(opts);
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const results = [];
  let order = 0;
  const add = (check, status, detail) => results.push({ order: order++, check, status, detail });
  const guard = async (check, fn) => {
    try {
      await fn();
    } catch (err) {
      add(check, "FAIL", `check crashed: ${err?.message ?? err}`);
    }
  };

  let origin = opts.base;
  const get = (path, extra) => client.request(origin, path, extra);
  const failDetail = (page) =>
    page.status === 0 ? `request failed (${page.error})` : `${page.status}`;

  // 0. apex <-> www redirect, and which origin the rest of the run uses.
  await guard("apex redirect", async () => {
    const pair = apexWwwPair(opts.base);
    if (!pair) return add("apex redirect", "SKIP", "not applicable to this host");
    const proto = new URL(opts.base).protocol;
    const apexOrigin = `${proto}//${pair.apex}`;
    const res = await client.request(apexOrigin, "/");
    const verdict = classifyApex(res.status, res.location, pair.www);
    add("apex redirect", verdict.status, verdict.detail);
    if (new URL(opts.base).hostname === pair.apex && verdict.redirectsToWww) {
      origin = `${proto}//${pair.www}`;
      log(`apex redirects; testing ${origin}`);
    }
  });

  // 1. /merchandise
  await guard("/merchandise", async () => {
    const page = await get("/merchandise");
    if (page.status !== 200) return add("/merchandise", "FAIL", failDetail(page));
    const links = extractProductLinks(page.text);
    add(
      "/merchandise",
      links.length > 0 ? "PASS" : "FAIL",
      links.length > 0 ? `200, ${links.length} product links` : "200 but no product links found"
    );
  });

  // 3a. sitemap
  let categories = [];
  let products = [];
  await guard("/sitemap.xml", async () => {
    const res = await get("/sitemap.xml");
    if (res.status !== 200) return add("/sitemap.xml", "FAIL", failDetail(res));
    const parsed = parseSitemap(res.text);
    if (parsed.isIndex) {
      return add("/sitemap.xml", "FAIL", "is a sitemap index; page URLs not listed directly");
    }
    ({ categories, products } = classifySitemapUrls(parsed.urls));
    const ok = parsed.urls.length >= opts.minSitemap;
    add(
      "/sitemap.xml",
      ok ? "PASS" : "FAIL",
      `${parsed.urls.length} URLs (min ${opts.minSitemap}), ${categories.length} categories, ${products.length} products`
    );
  });

  // 2. category landing pages
  let categoryPerf = null;
  await guard("category pages", async () => {
    if (categories.length === 0) {
      return add("category pages", "FAIL", "no /merchandise/category/ URLs in the sitemap");
    }
    const bad = [];
    for (const path of categories) {
      const page = await get(path);
      if (page.status !== 200) bad.push(`${path} ${page.status}`);
      else if (!categoryPerf) categoryPerf = { path, bytes: page.bytes, ms: page.ms };
    }
    add(
      "category pages",
      bad.length ? "FAIL" : "PASS",
      bad.length
        ? `${categories.length - bad.length}/${categories.length} return 200; ${listSome(bad)}`
        : `${categories.length}/${categories.length} return 200`
    );
  });

  // 3b + 9. sampled product pages and their first image
  const sampled = sampleSeeded(products, opts.sample, seed);
  log(`sampling ${sampled.length} of ${products.length} products (seed ${seed})`);
  await guard("product pages", async () => {
    if (sampled.length === 0) {
      return add("product pages", "FAIL", "no product URLs available to sample");
    }
    const names = {
      title: "product <title>",
      h1: "product <h1>",
      price: "product price",
      img: "product <img>",
      jsonld: "product JSON-LD",
    };
    const statusBad = [];
    const fieldBad = { title: [], h1: [], price: [], img: [], jsonld: [] };
    const images = [];
    let loaded = 0;
    for (const path of sampled) {
      const page = await get(path);
      if (page.status !== 200) {
        statusBad.push(`${path} ${page.status}`);
        continue;
      }
      loaded += 1;
      const analysis = analyzeProductPage(page.text);
      for (const key of Object.keys(fieldBad)) if (!analysis.checks[key]) fieldBad[key].push(path);
      if (analysis.image) images.push({ page: path, src: analysis.image });
    }
    add(
      "product pages 200",
      statusBad.length ? "FAIL" : "PASS",
      statusBad.length
        ? `${sampled.length - statusBad.length}/${sampled.length}; ${listSome(statusBad)}`
        : `${sampled.length}/${sampled.length} return 200`
    );
    for (const key of Object.keys(names)) {
      const bad = fieldBad[key];
      add(
        names[key],
        bad.length ? "FAIL" : "PASS",
        bad.length
          ? `${loaded - bad.length}/${loaded} ok; missing on ${listSome(bad)}`
          : `${loaded}/${loaded} ok`
      );
    }

    // First image of each sampled page: GET headers only, body cancelled.
    const imageBad = [];
    let imageChecked = 0;
    for (const { page, src } of images) {
      let target;
      try {
        target = new URL(shrinkNextImage(src), origin);
      } catch {
        imageBad.push(`${page} (bad src)`);
        continue;
      }
      if (target.origin !== new URL(origin).origin) continue; // third-party: not ours to probe
      imageChecked += 1;
      const res = await get(target.pathname + target.search, {
        readBody: false,
        headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      });
      if (res.status !== 200 || !/^image\//i.test(res.contentType)) {
        imageBad.push(`${target.pathname} ${res.status || "failed"} ${res.contentType}`.trim());
      }
    }
    add(
      "product images",
      imageBad.length || imageChecked === 0 ? "FAIL" : "PASS",
      imageChecked === 0
        ? "no image URLs to check"
        : imageBad.length
          ? `${imageChecked - imageBad.length}/${imageChecked} return 200 image/*; ${listSome(imageBad)}`
          : `${imageChecked}/${imageChecked} return 200 with an image content-type`
    );
  });

  // 4. robots.txt
  await guard("robots.txt", async () => {
    const res = await get("/robots.txt");
    if (res.status !== 200) return add("robots.txt", "FAIL", failDetail(res));
    const robots = checkRobots(res.text);
    if (robots.blocksEverything)
      return add("robots.txt", "FAIL", "Disallow: / blocks the whole site");
    add(
      "robots.txt",
      robots.missing.length ? "FAIL" : "PASS",
      robots.missing.length
        ? `no Disallow for ${robots.missing.join(", ")}`
        : `disallows ${ROBOTS_REQUIRED_DISALLOWS.join(", ")}`
    );
  });

  // 5. /admin
  await guard("/admin not public", async () => {
    const res = await get("/admin");
    const verdict = classifyAdmin(res.status, res.location);
    add("/admin not public", verdict.status, verdict.detail);
  });

  // 6. order lookup
  await guard("/orders/MG-00001 404", async () => {
    const res = await get("/orders/MG-00001");
    add("/orders/MG-00001 404", res.status === 404 ? "PASS" : "FAIL", failDetail(res));
  });

  // 7. hidden products
  await guard("hidden products 404", async () => {
    const hidden = readHiddenIds();
    if (!hidden || hidden.length === 0) {
      return add(
        "hidden products 404",
        "SKIP",
        "src/config/hiddenProducts.json not found (run inside the repo)"
      );
    }
    const picked = hidden.slice(0, 3);
    const bad = [];
    for (const id of picked) {
      const res = await get(`/merchandise/${encodeURIComponent(id)}`);
      if (res.status !== 404) bad.push(`${id} ${res.status}`);
    }
    add(
      "hidden products 404",
      bad.length ? "FAIL" : "PASS",
      bad.length
        ? `still served: ${listSome(bad)}`
        : `${picked.length}/${picked.length} return 404 (${hidden.length} hidden in config)`
    );
    const listed = hidden.filter((id) => products.includes(`/merchandise/${id}`));
    if (products.length) {
      add(
        "hidden not in sitemap",
        listed.length ? "FAIL" : "PASS",
        listed.length
          ? `listed: ${listSome(listed)}`
          : "none of the hidden products are in the sitemap"
      );
    }
  });

  // 8. webhook (opt-in, the only non-GET)
  await guard("webhook rejects unsigned", async () => {
    if (!opts.probeWebhook) {
      return add("webhook rejects unsigned", "SKIP", "opt-in: pass --probe-webhook");
    }
    const res = await get(WEBHOOK_PATH, {
      method: "POST",
      body: "",
      headers: { "content-length": "0" },
    });
    const verdict = classifyWebhook(res.status);
    add("webhook rejects unsigned", verdict.status, verdict.detail);
  });

  // 10. weight and speed
  await guard("perf /merchandise/cart", async () => {
    const res = await get("/merchandise/cart");
    if (res.status !== 200) return add("perf /merchandise/cart", "FAIL", failDetail(res));
    const verdict = classifyPerf(res.bytes, res.ms);
    add("perf /merchandise/cart", verdict.status, verdict.detail);
  });
  await guard("perf category page", async () => {
    if (!categoryPerf) return add("perf category page", "SKIP", "no category page loaded");
    const verdict = classifyPerf(categoryPerf.bytes, categoryPerf.ms);
    add(`perf category page`, verdict.status, `${categoryPerf.path}: ${verdict.detail}`);
  });

  return {
    base: origin,
    seed,
    sample: sampled.length,
    sitemapProducts: products.length,
    durationMs: Math.round(performance.now() - startedAt),
    requests: { ...client.stats },
    results,
  };
}

const USAGE = `Usage: npm run smoke -- [base-url] [flags]

  base-url          site to test (default ${DEFAULT_BASE_URL})
  --json            machine-readable output
  --sample N        product pages to sample (default ${DEFAULT_SAMPLE})
  --seed N          sampler seed (default random; printed in the report)
  --min-sitemap N   minimum sitemap URLs (default ${DEFAULT_MIN_SITEMAP})
  --probe-webhook   also send one unsigned empty POST to ${WEBHOOK_PATH}
  --timeout MS      per-request timeout (default ${DEFAULT_TIMEOUT_MS})

Exit codes: 0 healthy, 1 any FAIL, 2 bad usage.`;

export async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  if (opts.error) {
    console.error(`smoke: ${opts.error}\n\n${USAGE}`);
    return 2;
  }
  const log = process.stderr.isTTY && !opts.json ? (msg) => console.error(`  ${msg}`) : () => {};
  const report = await runSmoke(opts, { log });
  if (opts.json) console.log(JSON.stringify(buildJsonReport(report), null, 2));
  else console.log(formatReport(report));
  return summarize(report.results).healthy ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(`smoke: ${err?.stack ?? err}`);
      process.exit(1);
    }
  );
}
