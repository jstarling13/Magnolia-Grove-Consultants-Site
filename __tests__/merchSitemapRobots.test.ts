import { afterEach, describe, expect, it, vi } from "vitest";
import { merchandiseCategories, products } from "@/config/merchandiseConfig";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { categorySlug } from "@/lib/merchSlug";
import { getSiteUrl } from "@/lib/siteUrl";

describe("sitemap()", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);
  const site = getSiteUrl();

  it("keeps the existing site pages", () => {
    expect(urls).toContain(`${site}`);
    expect(urls).toContain(`${site}/services`);
  });

  it("includes /merchandise, every populated category and every product once", () => {
    expect(urls).toContain(`${site}/merchandise`);
    const used = new Set(products.map((p) => p.category));
    for (const category of merchandiseCategories.filter((c) => used.has(c))) {
      expect(urls).toContain(`${site}/merchandise/category/${categorySlug(category)}`);
    }
    for (const product of products) {
      expect(urls.filter((u) => u === `${site}/merchandise/${product.id}`)).toHaveLength(1);
    }
  });

  it("has no duplicates, uses absolute URLs, and leaves out private pages", () => {
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url).toMatch(/^https?:\/\/[^/]+(\/.*)?$/);
    expect(urls.join("\n")).not.toMatch(
      /\/(admin|account|api|merchandise\/cart(?:\/|$)|lookup\.json)/
    );
    expect(urls.join("\n")).not.toMatch(/espplus/i);
  });
});

describe("sitemap() lastmod", () => {
  afterEach(() => vi.useRealTimers());

  it("is the same on every call, however much time passes between requests", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    const first = sitemap();
    vi.setSystemTime(new Date("2031-06-01T00:00:00Z"));
    const second = sitemap();
    expect(second.map((entry) => entry.lastModified)).toEqual(
      first.map((entry) => entry.lastModified)
    );
    const stamps = new Set(first.map((entry) => String(entry.lastModified)));
    expect(stamps.size).toBe(1);
  });

  it("is not the time of the request", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2040-01-01T00:00:00Z"));
    for (const entry of sitemap()) {
      expect(new Date(entry.lastModified as Date).getFullYear()).toBeLessThan(2040);
    }
  });
});

describe("robots()", () => {
  const result = robots();
  const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  const disallow = ([] as string[]).concat(rule.disallow ?? []);

  it("allows the storefront and blocks private areas", () => {
    expect(rule.allow).toBe("/");
    for (const path of ["/admin", "/account", "/api/", "/merchandise/cart"]) {
      expect(disallow).toContain(path);
    }
    expect(disallow).not.toContain("/merchandise");
    expect(disallow).not.toContain("/");
  });

  it("points at the sitemap on the site origin", () => {
    expect(result.sitemap).toBe(`${getSiteUrl()}/sitemap.xml`);
  });
});

import { normalizeSiteUrl } from "@/lib/siteUrl";

describe("normalizeSiteUrl host", () => {
  it("uses www for the apex domain, which redirects to www", () => {
    expect(normalizeSiteUrl("https://magnoliagrovega.com")).toBe("https://www.magnoliagrovega.com");
    expect(normalizeSiteUrl("https://magnoliagrovega.com/")).toBe(
      "https://www.magnoliagrovega.com"
    );
  });

  it("leaves www and other hosts alone", () => {
    expect(normalizeSiteUrl("https://www.magnoliagrovega.com")).toBe(
      "https://www.magnoliagrovega.com"
    );
    expect(normalizeSiteUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeSiteUrl(undefined)).toBe("https://magnolia-grove-consultants.vercel.app");
  });
});
