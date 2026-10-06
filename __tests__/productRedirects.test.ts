import { describe, expect, it } from "vitest";
import redirectsJson from "@/config/productRedirects.json";
import { allProducts, products } from "@/config/merchandiseConfig";
import { categorySlug } from "@/lib/merchSlug";
import { getStorefrontCategories } from "@/lib/merchStorefront";

const redirects = redirectsJson as Record<string, string>;
const entries = Object.entries(redirects);
const liveIds = new Set(products.map((p) => p.id));
const knownIds = new Set(allProducts.map((p) => p.id));
const categorySlugs = new Set(getStorefrontCategories().map(categorySlug));
const CATEGORY_PREFIX = "/merchandise/category/";

describe("product redirects", () => {
  it("has entries", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("sends every old id to a live product or a live category page", () => {
    const bad = entries.filter(([, target]) =>
      target.startsWith("/")
        ? !(
            target.startsWith(CATEGORY_PREFIX) &&
            categorySlugs.has(target.slice(CATEGORY_PREFIX.length))
          )
        : !liveIds.has(target)
    );
    expect(bad).toEqual([]);
  });

  it("never redirects away from a product that exists (live, unreviewed or hidden)", () => {
    expect(entries.map(([oldId]) => oldId).filter((id) => knownIds.has(id))).toEqual([]);
  });

  it("has no redirect chains or loops", () => {
    const chained = entries.filter(([, target]) => target in redirects);
    expect(chained).toEqual([]);
  });

  it("only uses characters that are safe inside a route pattern", () => {
    expect(Object.keys(redirects).filter((id) => !/^[a-z0-9-]+$/.test(id))).toEqual([]);
  });
});

describe("next.config redirects", () => {
  it("emits permanent redirects that cover every old id with a short rule list", async () => {
    const config = (await import("../next.config.mjs")).default;
    const rules = await config.redirects!();
    const productRules = rules.filter((r) => r.source.startsWith("/merchandise/:oldId("));
    expect(productRules.length).toBeLessThanOrEqual(30);
    expect(productRules.every((r) => r.permanent)).toBe(true);

    const emitted = new Map<string, string>();
    for (const rule of productRules) {
      const ids = /^\/merchandise\/:oldId\((.*)\)$/.exec(rule.source)![1].split("|");
      for (const id of ids) emitted.set(id, rule.destination);
    }
    const expected = new Map(
      entries.map(([oldId, target]) => [
        oldId,
        target.startsWith("/") ? target : `/merchandise/${target}`,
      ])
    );
    expect(emitted).toEqual(expected);
  });
});
