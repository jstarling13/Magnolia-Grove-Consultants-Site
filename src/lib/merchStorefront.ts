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
import { toCatalogProduct, type CatalogProduct } from "@/lib/merchCatalog";

export interface StorefrontCatalog {
  /** Categories that currently have products, in display order. */
  categories: string[];
  /** Card-sized products in "featured" order (grouped by category). */
  products: CatalogProduct[];
}

export function getStorefrontCatalog(): StorefrontCatalog {
  const groups = groupByCategory(products);
  return {
    categories: merchandiseCategories.filter((category) =>
      groups.some((group) => group.category === category)
    ),
    products: groups.flatMap((group) =>
      group.items.map((product) =>
        toCatalogProduct(product, getImprintArea(product), { truncateDescription: true })
      )
    ),
  };
}

export function getStorefrontProduct(id: string): CatalogProduct | undefined {
  const product = getProductById(id);
  return product ? toCatalogProduct(product, getImprintArea(product)) : undefined;
}

/** Everything the cart page needs to render lines for any product id. */
export function getCartCatalog(): CatalogProduct[] {
  return products.map((product) =>
    toCatalogProduct(
      { ...product, description: "", colors: undefined, colorImages: undefined },
      getImprintArea(product)
    )
  );
}
