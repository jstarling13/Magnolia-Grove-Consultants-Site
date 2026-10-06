"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/merchandise/ProductCard";
import {
  FilterStatus,
  FilterToolbar,
  focusFilterToggle,
} from "@/components/merchandise/CatalogFilters";
import { useCatalogParams } from "@/hooks/useCatalogParams";
import { useMerchBrowseAnalytics } from "@/hooks/useMerchBrowseAnalytics";
import { useCategoryCards } from "@/components/merchandise/useCategoryCards";
import {
  FILTER_ALL as ALL,
  FOCUSED_INITIAL_VISIBLE,
  NO_FILTERS,
  SHOW_MORE_STEP,
  categoriesNeeded,
  filterProducts,
  growVisible,
  nextBatchSize,
  realBrands,
  searchHaystack,
  searchProducts,
  sortProducts,
  type CatalogProduct,
} from "@/lib/merchCatalog";
import {
  activeFilterChips,
  filtersKey,
  hasActiveParams,
  priceBucketsFor,
  type PriceBucket,
} from "@/lib/merchFilters";

interface CategoryProductGridProps {
  /**
   * Products of one category, in "featured" order. The page ships only the
   * first screenful; the rest is fetched on demand (Show more, search, sort,
   * brand filter). Passing every product also works (nothing is fetched).
   */
  products: CatalogProduct[];
  category: string;
  /** How many products the category has in all. Defaults to `products.length`. */
  total?: number;
  /** Every real brand in the category. Defaults to the brands in `products`. */
  brands?: string[];
  /** Price filter choices; defaults to buckets from the products on hand. */
  priceBuckets?: PriceBucket[];
}

/** The first row (up to 4 cards) is on screen on a desktop and is the LCP candidate there. */
const PRIORITY_CARDS = 4;

/**
 * Search, sort, filters and "Show more" for one category's landing page.
 * Same behavior and shareable URL params (?q=&sort=&brand=&usa=&price=...) as
 * the main catalog, minus the category chips.
 */
export default function CategoryProductGrid({
  products: initialProducts,
  category,
  total: totalProp,
  brands: brandsProp,
  priceBuckets: bucketsProp,
}: CategoryProductGridProps) {
  const [disclosure, setDisclosure] = useState<{ key: string; count: number } | null>(null);
  // True while "Show more" waits for the rest of the category to arrive.
  const [busy, setBusy] = useState(false);
  const { loaded, failed: failedByCategory, load } = useCategoryCards();

  const total = totalProp ?? initialProducts.length;
  const complete = loaded[category] !== undefined || initialProducts.length >= total;
  const products = loaded[category] ?? initialProducts;
  const brands = useMemo(() => brandsProp ?? realBrands(products), [brandsProp, products]);
  const { params, queryInput, onQueryInput, update } = useCatalogParams({ brands });
  const { brand, query, sort, filters } = params;
  const filterKey = `${brand}|${query}|${sort}|${filtersKey(filters)}`;
  const haystacks = useRef(new Map<string, string>());
  const haystackOf = useCallback((product: CatalogProduct) => {
    let text = haystacks.current.get(product.id);
    if (text === undefined) {
      text = searchHaystack(product);
      haystacks.current.set(product.id, text);
    }
    return text;
  }, []);
  const completeRef = useRef(complete);
  completeRef.current = complete;
  /** Starts fetching the rest of the category (focus on a control). */
  const warm = useCallback(() => {
    if (!completeRef.current) void load([category]);
  }, [load, category]);

  // Searching, filtering and sorting need the whole category. Until it
  // is here the page keeps showing the unfiltered first cards with a
  // "Loading" note, never a half-filtered list.
  const needsAll =
    categoriesNeeded({ category: ALL, brand, query, sort, filters }, [category]).length > 0;
  const ready = complete || !needsAll;
  const failed = !ready && Boolean(failedByCategory[category]);
  const loading = !ready && !failed;
  useEffect(() => {
    if (needsAll && !complete) void load([category]);
  }, [needsAll, complete, load, category]);

  const results = useMemo(() => {
    if (!ready) return products;
    const byBrand =
      brand === ALL ? products : products.filter((product) => product.brand === brand);
    const byFilters = filterProducts(byBrand, filters);
    // Ranked by relevance (name, brand, category, color, description); the
    // sort keeps that ranking as its tie-break.
    const matching = query ? searchProducts(byFilters, query, haystackOf) : byFilters;
    return sortProducts(matching, sort);
  }, [ready, products, brand, query, sort, filters, haystackOf]);

  const hasFilters = hasActiveParams(params, queryInput);
  const chips = useMemo(() => activeFilterChips(params), [params]);
  const priceBuckets = useMemo(
    () => bucketsProp ?? priceBucketsFor(products),
    [bucketsProp, products]
  );
  // Without a search, brand filter or sort the view is the whole category,
  // so its size is the real total even while only the first cards are here.
  const resultCount = ready && needsAll ? results.length : total;
  const visible = disclosure?.key === filterKey ? disclosure.count : FOCUSED_INITIAL_VISIBLE;
  const shown = Math.min(visible, resultCount);
  const batch = nextBatchSize(shown, resultCount);
  useMerchBrowseAnalytics(category, () => results.slice(0, FOCUSED_INITIAL_VISIBLE), query);

  async function showMore() {
    if (!completeRef.current) {
      setBusy(true);
      const ok = await load([category]);
      setBusy(false);
      if (!ok) return;
    }
    setDisclosure({ key: filterKey, count: growVisible(shown, resultCount, SHOW_MORE_STEP) });
  }

  function clearFilters() {
    update({ brand: ALL, query: "", filters: NO_FILTERS });
  }

  const statusText = loading
    ? "Loading products…"
    : resultCount === 0
      ? "No products found"
      : `Showing ${resultCount} ${resultCount === 1 ? "product" : "products"}`;

  return (
    <div>
      <FilterToolbar
        idPrefix="category"
        searchValue={queryInput}
        onSearch={onQueryInput}
        searchLabel={`Search ${category}`}
        searchPlaceholder={`Search ${category.toLowerCase()}`}
        sort={sort}
        onSort={(next) => update({ sort: next })}
        brand={brand}
        brands={brands}
        onBrand={(next) => update({ brand: next })}
        filters={filters}
        onFilters={(next) => update({ filters: next })}
        priceBuckets={priceBuckets}
        onIntent={warm}
      />

      <FilterStatus
        idPrefix="category"
        statusText={statusText}
        chips={chips}
        onRemoveChip={(chip) => update(chip.remove)}
        canClear={hasFilters}
        onClearAll={clearFilters}
      />

      {failed && (
        <p role="alert" className="mt-3 text-sm text-onyx/70">
          We couldn&apos;t load the full list.{" "}
          <button
            type="button"
            onClick={() => void load([category])}
            className="font-semibold text-gold-text underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </p>
      )}

      {resultCount === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gold/40 px-6 py-14 text-center">
          <p className="text-base font-semibold text-onyx">No products match your filters.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-onyx/60">
            Try a different search, or clear all filters.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                clearFilters();
                focusFilterToggle("category");
              }}
              className="mt-6 min-h-[44px] rounded-md border border-gold/40 px-5 py-2.5 text-sm font-semibold text-onyx transition-colors hover:border-gold hover:bg-gold/10"
            >
              Clear all
            </button>
          )}
        </div>
      ) : (
        <div aria-busy={loading}>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {results.slice(0, shown).map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < PRIORITY_CARDS} />
            ))}
          </div>

          {resultCount > FOCUSED_INITIAL_VISIBLE && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-xs text-onyx/60" aria-live="polite">
                Showing {shown} of {resultCount}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {batch > 0 && (
                  <button
                    type="button"
                    aria-label={`Show ${batch} more ${batch === 1 ? "product" : "products"}`}
                    aria-busy={busy}
                    disabled={busy}
                    onPointerEnter={warm}
                    onFocus={warm}
                    onClick={() => void showMore()}
                    className="rounded-md border border-gold/40 px-6 py-2.5 text-sm font-semibold text-onyx transition-colors hover:border-gold hover:bg-gold/10 disabled:cursor-wait disabled:opacity-60"
                  >
                    {busy ? "Loading…" : `Show ${batch} more`}
                  </button>
                )}
                {shown > FOCUSED_INITIAL_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => {
                      setDisclosure({ key: filterKey, count: FOCUSED_INITIAL_VISIBLE });
                      document
                        .getElementById("category-products")
                        ?.scrollIntoView({ block: "start" });
                    }}
                    className="rounded-md px-4 py-2.5 text-sm font-semibold text-onyx/60 transition-colors hover:text-onyx"
                  >
                    Show fewer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
