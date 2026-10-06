/**
 * Server-side adapter between the merchandise config and the storefront UI.
 * Import this only from server components (pages): it pulls in the full
 * config, whose price tiers carry supplier-side data that must never be
 * serialised to the browser. Everything it returns is the slim,
 * customer-safe CatalogProduct model from merchCatalog.ts.
 */

import {
  getImprintArea,
  getProductById,
  groupByCategory,
  merchandiseCategories,
  products,
} from "@/config/merchandiseConfig";
import {
  INITIAL_VISIBLE,
  countByCategory,
  firstPerCategory,
  realBrands,
  startingTier,
  toCardProduct,
  toCartProduct,
  toCatalogProduct,
  type CartProduct,
  type CatalogProduct,
} from "@/lib/merchCatalog";
import { priceBucketsFor, type PriceBucket } from "@/lib/merchFilters";
import { selectRelated } from "@/lib/merchRelated";
import { findCategoryBySlug } from "@/lib/merchSlug";

export interface StorefrontCatalog {
  /** Categories that currently have products, in display order. */
  categories: string[];
  /** Card-sized products in "featured" order (grouped by category). */
  products: CatalogProduct[];
}

export interface StorefrontInitialCatalog {
  categories: string[];
  /** Only the first cards of each category, in "featured" order. */
  products: CatalogProduct[];
  /** Full size of every category, so counts are right before the rest loads. */
  categoryTotals: Record<string, number>;
  /** Every real brand in the full catalog, for the brand filter. */
  brands: string[];
  /** Price filter choices cut from the full catalog's first-tier prices. */
  priceBuckets: PriceBucket[];
}

export function getStorefrontCatalog(): StorefrontCatalog {
  const groups = groupByCategory(products);
  return {
    categories: merchandiseCategories.filter((category) =>
      groups.some((group) => group.category === category)
    ),
    products: groups.flatMap((group) =>
      group.items.map((product) =>
        toCardProduct(
          toCatalogProduct(product, getImprintArea(product), { truncateDescription: true })
        )
      )
    ),
  };
}

/**
 * What the main catalog page ships up front: the first `perCategory` cards of
 * each category plus the totals and brand list the controls need. The rest of
 * each category is fetched from its static cards.json when the shopper asks
 * for it (Show more, search, sort, brand filter), so the page's HTML and RSC
 * payload stay the same size however large the catalog grows.
 */
export function getStorefrontInitialCatalog(
  perCategory = INITIAL_VISIBLE
): StorefrontInitialCatalog {
  const full = getStorefrontCatalog();
  return {
    categories: full.categories,
    products: firstPerCategory(full.products, perCategory),
    categoryTotals: countByCategory(full.products),
    brands: realBrands(full.products),
    priceBuckets: priceBucketsFor(full.products),
  };
}

export function getStorefrontProduct(id: string): CatalogProduct | undefined {
  const product = getProductById(id);
  return product ? toCatalogProduct(product, getImprintArea(product)) : undefined;
}

/**
 * One product in the cart's shape, or undefined when the id is unknown or the
 * product is hidden. Served as static JSON per product (merchandise/[id]/cart.json)
 * and fetched by the cart only for the products a shopper actually has in it.
 */
export function getCartProduct(id: string): CartProduct | undefined {
  const product = getProductById(id);
  return product
    ? toCartProduct(toCatalogProduct({ ...product, description: "" }, getImprintArea(product)))
    : undefined;
}

/** Ids of every product the storefront sells; the cart uses them to drop lines for products that are gone. */
export function getAvailableProductIds(): string[] {
  return products.map((product) => product.id);
}

/**
 * Every product in full cart-page form. No longer shipped to the browser (the
 * cart fetches only what it needs, see getCartProduct); kept so tests can
 * check the whole catalog's cart data in one pass.
 */
export function getCartCatalog(): CatalogProduct[] {
  return products.map((product) =>
    toCatalogProduct({ ...product, description: "" }, getImprintArea(product))
  );
}

/** Categories that currently have products, in display order. */
export function getStorefrontCategories(): string[] {
  return merchandiseCategories.filter((category) =>
    products.some((product) => product.category === category)
  );
}

/** Card-sized products of one category slug, or undefined for an unknown slug. */
export function getCategoryCatalog(
  slug: string
): { category: string; products: CatalogProduct[] } | undefined {
  const category = findCategoryBySlug(slug, getStorefrontCategories());
  if (!category) return undefined;
  const group = groupByCategory(products.filter((product) => product.category === category))[0];
  return {
    category,
    products: group.items.map((product) =>
      toCatalogProduct(product, getImprintArea(product), { truncateDescription: true })
    ),
  };
}

/**
 * Lean cards for every product of one category, served as static JSON by the
 * category's cards.json route and used for the first screenful on its page.
 */
export function getCategoryCards(
  slug: string
): { category: string; cards: CatalogProduct[]; brands: string[] } | undefined {
  const catalog = getCategoryCatalog(slug);
  if (!catalog) return undefined;
  const cards = catalog.products.map(toCardProduct);
  return { category: catalog.category, cards, brands: realBrands(cards) };
}

/**
 * "More in <category>": up to four other products from the same category,
 * as card-sized products. Only the chosen few are returned, so the rest of
 * the catalog never reaches the browser.
 */
export function getRelatedProducts(id: string): CatalogProduct[] {
  const current = getProductById(id);
  if (!current) return [];
  const sameCategory = products
    .filter((product) => product.category === current.category)
    .map((product) =>
      toCatalogProduct(product, getImprintArea(product), { truncateDescription: true })
    );
  return selectRelated(
    toCatalogProduct(current, getImprintArea(current), { truncateDescription: true }),
    sameCategory
  ).map(toCardProduct);
}

export interface RecentLookupEntry {
  id: string;
  name: string;
  image?: string;
  startingPrice: number;
}

/**
 * Minimal id -> display lookup for the "Recently viewed" strip. Served as a
 * static JSON file and fetched only when the shopper has history, which
 * keeps the full catalog out of every page's payload.
 */
export function getRecentLookup(): Record<string, RecentLookupEntry> {
  return Object.fromEntries(
    products.map((product) => {
      const slim = toCatalogProduct({ ...product, description: "" }, getImprintArea(product));
      return [
        slim.id,
        {
          id: slim.id,
          name: slim.name,
          ...(slim.image && { image: slim.image }),
          startingPrice: startingTier(slim).price,
        },
      ];
    })
  );
}
