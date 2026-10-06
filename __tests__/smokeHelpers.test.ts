// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  analyzeProductPage,
  apexWwwPair,
  buildJsonReport,
  checkRobots,
  classifyAdmin,
  classifyApex,
  classifyPerf,
  classifySitemapUrls,
  classifyWebhook,
  createLimiter,
  createRng,
  extractJsonLd,
  extractProductLinks,
  extractTitle,
  formatTable,
  formatVerdict,
  hasH1,
  hasPrice,
  isRequestAllowed,
  jsonLdTypes,
  listSome,
  normalizeBaseUrl,
  parseArgs,
  parseRobotsDisallows,
  parseSitemap,
  pickProductImage,
  sampleSeeded,
  shrinkNextImage,
  summarize,
  WEBHOOK_PATH,
} from "../scripts/smoke.mjs";

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example.com</loc></url>
<url><loc>https://example.com/merchandise</loc></url>
<url><loc>https://example.com/merchandise/category/apparel</loc></url>
<url><loc>https://example.com/merchandise/category/bags-and-totes/</loc></url>
<url><loc>https://example.com/merchandise/red-shirt-123</loc></url>
<url><loc>https://example.com/merchandise/red-shirt-123</loc></url>
<url><loc> https://example.com/merchandise/a-&amp;-b-9 </loc></url>
<url><loc>https://example.com/merchandise/cart</loc></url>
<url><loc>https://example.com/merchandise/ids.json</loc></url>
<url><loc>https://example.com/about</loc></url>
</urlset>`;

describe("sitemap parsing", () => {
  it("extracts and decodes every <loc>", () => {
    const { urls, isIndex } = parseSitemap(SITEMAP);
    expect(isIndex).toBe(false);
    expect(urls).toHaveLength(10);
    expect(urls).toContain("https://example.com/merchandise/a-&-b-9");
  });

  it("flags a sitemap index", () => {
    expect(
      parseSitemap(
        "<sitemapindex><sitemap><loc>https://x.test/a.xml</loc></sitemap></sitemapindex>"
      ).isIndex
    ).toBe(true);
  });

  it("returns nothing for empty or garbage input", () => {
    expect(parseSitemap("").urls).toEqual([]);
    expect(parseSitemap(undefined).urls).toEqual([]);
    expect(parseSitemap("<html>nope</html>").urls).toEqual([]);
  });

  it("splits categories from products, dedupes, and keeps only paths", () => {
    const { categories, products } = classifySitemapUrls(parseSitemap(SITEMAP).urls);
    expect(categories).toEqual([
      "/merchandise/category/apparel",
      "/merchandise/category/bags-and-totes",
    ]);
    expect(products).toEqual(["/merchandise/red-shirt-123", "/merchandise/a-&-b-9"]);
  });
});

describe("seeded sampling", () => {
  const items = Array.from({ length: 100 }, (_, i) => `/p/${i}`);

  it("is deterministic for a given seed and differs across seeds", () => {
    expect(sampleSeeded(items, 10, 42)).toEqual(sampleSeeded(items, 10, 42));
    expect(sampleSeeded(items, 10, 42)).not.toEqual(sampleSeeded(items, 10, 43));
  });

  it("returns distinct members and does not mutate the input", () => {
    const copy = [...items];
    const sample = sampleSeeded(items, 40, 7);
    expect(sample).toHaveLength(40);
    expect(new Set(sample).size).toBe(40);
    expect(sample.every((s) => items.includes(s))).toBe(true);
    expect(items).toEqual(copy);
  });

  it("clamps n to the pool size and to zero", () => {
    expect(sampleSeeded(["a", "b"], 10, 1)).toHaveLength(2);
    expect(sampleSeeded(["a", "b"], 0, 1)).toEqual([]);
    expect(sampleSeeded([], 5, 1)).toEqual([]);
  });

  it("produces values in [0, 1)", () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("JSON-LD extraction", () => {
  const html = `<head>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Mug"}</script>
    <script type="application/ld+json" id="x">{"@graph":[{"@type":"BreadcrumbList"},{"@type":["Offer","Thing"]}]}</script>
    <script type="application/json">{"not":"ld"}</script>
  </head>`;

  it("parses every block", () => {
    const { blocks, errors } = extractJsonLd(html);
    expect(errors).toBe(0);
    expect(blocks).toHaveLength(2);
    expect(jsonLdTypes(blocks)).toEqual(new Set(["Product", "BreadcrumbList", "Offer", "Thing"]));
  });

  it("counts unparseable blocks instead of throwing", () => {
    const bad = `<script type="application/ld+json">{oops</script><script type="application/ld+json">{"a":1}</script>`;
    expect(extractJsonLd(bad)).toEqual({ blocks: [{ a: 1 }], errors: 1 });
  });

  it("handles pages with none", () => {
    expect(extractJsonLd("<html></html>")).toEqual({ blocks: [], errors: 0 });
  });
});

describe("page inspection", () => {
  const page = `<html><head><title>Mug &amp; Cup | Magnolia</title></head><body>
    <img alt="logo" src="/_next/image?url=%2Fimages%2Flogo-magnolia-grove-white.png&amp;w=750&amp;q=75"/>
    <h1 class="x"><span>Mug</span></h1>
    <table><tr><td>$4.90</td></tr></table>
    <img alt="Mug" src="/_next/image?url=%2Fimages%2Fmerch%2Fmug-1.webp&amp;w=3840&amp;q=75"/>
    <script type="application/ld+json">{"@type":"Product"}</script>
  </body></html>`;

  it("reads title, h1, price", () => {
    expect(extractTitle(page)).toBe("Mug & Cup | Magnolia");
    expect(hasH1(page)).toBe(true);
    expect(hasH1("<h1> <b></b> </h1>")).toBe(false);
    expect(hasPrice(page)).toBe(true);
    expect(hasPrice("<p>Call for a quote</p>")).toBe(false);
    expect(hasPrice("<p>from $1,200.50</p>")).toBe(true);
  });

  it("picks the product photo rather than the header logo", () => {
    expect(pickProductImage(page)).toBe(
      "/_next/image?url=%2Fimages%2Fmerch%2Fmug-1.webp&w=3840&q=75"
    );
  });

  it("falls back to the first non-logo image, and returns null with none", () => {
    expect(pickProductImage(`<img src="/logo.png"><img src="/photo.jpg">`)).toBe("/photo.jpg");
    expect(pickProductImage(`<img src="/logo.png">`)).toBeNull();
    expect(pickProductImage("<p>none</p>")).toBeNull();
  });

  it("rewrites the optimizer width but leaves plain paths alone", () => {
    expect(shrinkNextImage("/_next/image?url=%2Fa.webp&w=3840&q=75")).toBe(
      "/_next/image?url=%2Fa.webp&w=640&q=75"
    );
    expect(shrinkNextImage("/_next/image?url=%2Fa.webp&q=75")).toBe(
      "/_next/image?url=%2Fa.webp&q=75&w=640"
    );
    expect(shrinkNextImage("/images/merch/a.webp")).toBe("/images/merch/a.webp");
  });

  it("analyzes a complete product page as all-green", () => {
    const { checks } = analyzeProductPage(page);
    expect(Object.values(checks).every(Boolean)).toBe(true);
  });

  it("reports each missing piece, and treats bad JSON-LD or a not-found title as failures", () => {
    const { checks } = analyzeProductPage(
      `<title>Product Not Found | X</title><script type="application/ld+json">{bad</script>`
    );
    expect(checks).toEqual({ title: false, h1: false, price: false, img: false, jsonld: false });
  });

  it("extracts distinct product links and ignores cart/category/json", () => {
    const html = `<a href="/merchandise/a-1">x</a><a href="/merchandise/a-1#colors">y</a>
      <a href="/merchandise/b-2?x=1">z</a><a href="/merchandise/cart">c</a>
      <a href="/merchandise/category/apparel">k</a><a href="/merchandise/ids.json">j</a>`;
    expect(extractProductLinks(html)).toEqual(["a-1", "b-2"]);
  });
});

describe("robots.txt", () => {
  const robots = `User-Agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /orders
Disallow: /merchandise/cart # inline comment
Sitemap: https://example.com/sitemap.xml`;

  it("passes when every required path is disallowed", () => {
    const result = checkRobots(robots);
    expect(result.missing).toEqual([]);
    expect(result.blocksEverything).toBe(false);
  });

  it("reports the paths that lost their Disallow", () => {
    const result = checkRobots("User-agent: *\nDisallow: /api/\nDisallow: /admin");
    expect(result.missing).toEqual(["/orders", "/merchandise/cart"]);
  });

  it("accepts a broader prefix rule", () => {
    expect(
      checkRobots(
        "User-agent: *\nDisallow: /merchandise/c\nDisallow: /api/\nDisallow: /admin\nDisallow: /orders"
      ).missing
    ).toEqual([]);
  });

  it("only counts the * group and detects a site-wide block", () => {
    const text = `User-agent: Googlebot\nDisallow: /api/\n\nUser-agent: *\nDisallow: /`;
    expect(parseRobotsDisallows(text)).toEqual(["/"]);
    expect(checkRobots(text).blocksEverything).toBe(true);
  });
});

describe("classifiers", () => {
  it("/admin: login redirect or 401/403/404 pass, 200 fails", () => {
    expect(classifyAdmin(307, "https://x.test/admin/login").status).toBe("PASS");
    expect(classifyAdmin(302, "/login?next=/admin").status).toBe("PASS");
    expect(classifyAdmin(401).status).toBe("PASS");
    expect(classifyAdmin(404).status).toBe("PASS");
    expect(classifyAdmin(200).status).toBe("FAIL");
    expect(classifyAdmin(500).status).toBe("FAIL");
    expect(classifyAdmin(0).status).toBe("FAIL");
    expect(classifyAdmin(301, "/somewhere").status).toBe("WARN");
  });

  it("webhook: 503 fails, 400/401/403 pass, acceptance fails", () => {
    expect(classifyWebhook(503).status).toBe("FAIL");
    expect(classifyWebhook(503).detail).toMatch(/environment variables/);
    for (const code of [400, 401, 403]) expect(classifyWebhook(code).status).toBe("PASS");
    expect(classifyWebhook(200).status).toBe("FAIL");
    expect(classifyWebhook(500).status).toBe("FAIL");
    expect(classifyWebhook(404).status).toBe("WARN");
  });

  it("apex: redirect to www passes, anything else warns", () => {
    const www = "www.example.com";
    expect(classifyApex(308, "https://www.example.com/", www)).toMatchObject({
      status: "PASS",
      redirectsToWww: true,
    });
    expect(classifyApex(200, "", www).status).toBe("WARN");
    expect(classifyApex(301, "https://other.test/", www).status).toBe("WARN");
    expect(classifyApex(0, "", www).status).toBe("WARN");
  });

  it("perf: warns over 300 KB or 3 s", () => {
    expect(classifyPerf(50 * 1024, 200).status).toBe("PASS");
    expect(classifyPerf(301 * 1024, 200).status).toBe("WARN");
    expect(classifyPerf(10 * 1024, 3001).status).toBe("WARN");
    expect(classifyPerf(301 * 1024, 3001).detail).toMatch(/KB.*over 300 KB, over 3s/);
  });
});

describe("request policy and rate limiting", () => {
  it("allows GET always and POST only to the webhook when opted in", () => {
    expect(isRequestAllowed("GET", "/anything", false)).toBe(true);
    expect(isRequestAllowed("POST", WEBHOOK_PATH, false)).toBe(false);
    expect(isRequestAllowed("POST", WEBHOOK_PATH, true)).toBe(true);
    expect(isRequestAllowed("POST", "/api/checkout", true)).toBe(false);
    expect(isRequestAllowed("DELETE", WEBHOOK_PATH, true)).toBe(false);
    expect(isRequestAllowed("HEAD", "/", true)).toBe(false);
  });

  it("spaces request starts at most 5 per second on a fake clock", async () => {
    let clock = 1000;
    const starts: number[] = [];
    const wait = createLimiter(5, {
      now: () => clock,
      sleep: async (ms: number) => {
        clock += ms;
      },
    });
    for (let i = 0; i < 11; i++) {
      await wait();
      starts.push(clock);
    }
    for (let i = 1; i < starts.length; i++)
      expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(200);
    // No window of one second holds more than 5 request starts.
    for (let i = 0; i + 5 < starts.length; i++)
      expect(starts[i + 5] - starts[i]).toBeGreaterThanOrEqual(1000);
  });

  it("never allows a rate above 5 per second", async () => {
    let clock = 0;
    const wait = createLimiter(50, {
      now: () => clock,
      sleep: async (ms: number) => (clock += ms),
    });
    await wait();
    await wait();
    expect(clock).toBe(200);
  });
});

describe("arguments and base URL", () => {
  it("defaults to the production www site", () => {
    expect(parseArgs([])).toMatchObject({
      base: "https://www.magnoliagrovega.com",
      json: false,
      sample: 40,
      minSitemap: 800,
      probeWebhook: false,
      error: null,
    });
  });

  it("parses flags in both spellings", () => {
    const opts = parseArgs([
      "http://localhost:3000/",
      "--json",
      "--sample",
      "5",
      "--min-sitemap=10",
      "--seed",
      "9",
      "--probe-webhook",
    ]);
    expect(opts).toMatchObject({
      base: "http://localhost:3000",
      json: true,
      sample: 5,
      minSitemap: 10,
      seed: 9,
      probeWebhook: true,
      error: null,
    });
  });

  it("rejects bad input", () => {
    expect(parseArgs(["--sample", "abc"]).error).toMatch(/--sample/);
    expect(parseArgs(["--bogus"]).error).toMatch(/unknown flag/);
    expect(parseArgs(["a.test", "b.test"]).error).toMatch(/unexpected argument/);
    expect(parseArgs(["ftp://x.test"]).error).toMatch(/invalid base URL/);
  });

  it("normalizes base URLs", () => {
    expect(normalizeBaseUrl("example.com/shop/")).toBe("https://example.com");
    expect(normalizeBaseUrl("localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeBaseUrl("")).toBeNull();
  });

  it("works out the apex/www pair", () => {
    expect(apexWwwPair("https://www.example.com")).toEqual({
      apex: "example.com",
      www: "www.example.com",
    });
    expect(apexWwwPair("https://example.com")).toEqual({
      apex: "example.com",
      www: "www.example.com",
    });
    expect(apexWwwPair("http://localhost:3000")).toBeNull();
    expect(apexWwwPair("http://127.0.0.1:3000")).toBeNull();
    expect(apexWwwPair("https://preview.example.vercel.app")).toBeNull();
  });
});

describe("result formatting", () => {
  const results = [
    { order: 0, check: "/merchandise", status: "PASS", detail: "200, 160 product links" },
    { order: 1, check: "robots.txt", status: "FAIL", detail: "no Disallow for /orders" },
    { order: 2, check: "perf", status: "WARN", detail: "301.0 KB in 90 ms (over 300 KB)" },
    { order: 3, check: "webhook", status: "SKIP", detail: "opt-in" },
  ];

  it("summarizes counts and health", () => {
    expect(summarize(results)).toEqual({ PASS: 1, FAIL: 1, WARN: 1, SKIP: 1, healthy: false });
    expect(summarize(results.filter((r) => r.status !== "FAIL")).healthy).toBe(true);
  });

  it("prints HEALTHY only when nothing failed (warnings and skips are fine)", () => {
    expect(formatVerdict(results)).toMatch(
      /^PROBLEM \(1 passed, 1 failed, 1 warnings, 1 skipped\)$/
    );
    expect(formatVerdict(results.filter((r) => r.status !== "FAIL"))).toMatch(/^HEALTHY/);
  });

  it("aligns the table columns", () => {
    const lines = formatTable(results).split("\n");
    expect(lines[0]).toMatch(/^STATUS\s+CHECK\s+DETAIL$/);
    expect(lines).toHaveLength(2 + results.length);
    const detailCol = lines[0].indexOf("DETAIL");
    expect(lines[2].indexOf("200, 160")).toBe(detailCol);
    expect(lines[3].indexOf("no Disallow")).toBe(detailCol);
  });

  it("builds a JSON report without internal ordering fields", () => {
    const json = buildJsonReport({
      base: "https://x.test",
      seed: 1,
      sample: 2,
      durationMs: 3,
      requests: { total: 4, nonGet: 0 },
      results,
    });
    expect(json).toMatchObject({
      base: "https://x.test",
      healthy: false,
      counts: { pass: 1, fail: 1, warn: 1, skip: 1 },
      requests: { total: 4, nonGet: 0 },
    });
    expect(json.results[0]).toEqual({
      check: "/merchandise",
      status: "PASS",
      detail: "200, 160 product links",
    });
  });

  it("truncates long lists", () => {
    expect(listSome(["a", "b"], 3)).toBe("a, b");
    expect(listSome(["a", "b", "c", "d", "e"], 3)).toBe("a, b, c (+2 more)");
  });
});
