/**
 * URL slugs for merchandise categories ("Outdoor & Sports" -> "outdoor-sports").
 * Pure and client-safe: it never touches the product config.
 */

export function categorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Path of a category landing page. */
export function categoryPath(name: string): string {
  return `/merchandise/category/${categorySlug(name)}`;
}

/** The category whose slug matches, or undefined for an unknown slug. */
export function findCategoryBySlug(
  slug: string | undefined,
  categories: readonly string[]
): string | undefined {
  if (!slug) return undefined;
  return categories.find((name) => categorySlug(name) === slug);
}
