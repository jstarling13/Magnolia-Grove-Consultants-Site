import { describe, expect, it } from "vitest";
import { merchandiseCategories } from "@/config/merchandiseConfig";
import { categoryPath, categorySlug, findCategoryBySlug } from "@/lib/merchSlug";

describe("categorySlug", () => {
  it("lower-cases and collapses punctuation into single hyphens", () => {
    expect(categorySlug("Outdoor & Sports")).toBe("outdoor-sports");
    expect(categorySlug("Apparel")).toBe("apparel");
    expect(categorySlug("Gifts & Entertaining")).toBe("gifts-entertaining");
    expect(categorySlug("  Home -- & Decor! ")).toBe("home-decor");
  });

  it("gives every real category a unique, URL-safe slug", () => {
    const slugs = merchandiseCategories.map(categorySlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe("findCategoryBySlug", () => {
  it("round-trips every category", () => {
    for (const name of merchandiseCategories) {
      expect(findCategoryBySlug(categorySlug(name), merchandiseCategories)).toBe(name);
    }
  });

  it("returns undefined for unknown, empty or differently-cased slugs", () => {
    expect(findCategoryBySlug("nope", merchandiseCategories)).toBeUndefined();
    expect(findCategoryBySlug("", merchandiseCategories)).toBeUndefined();
    expect(findCategoryBySlug(undefined, merchandiseCategories)).toBeUndefined();
    expect(findCategoryBySlug("Outdoor-Sports", merchandiseCategories)).toBeUndefined();
  });
});

describe("categoryPath", () => {
  it("builds the landing page path", () => {
    expect(categoryPath("Outdoor & Sports")).toBe("/merchandise/category/outdoor-sports");
  });
});
