import { describe, expect, it } from "vitest";
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
