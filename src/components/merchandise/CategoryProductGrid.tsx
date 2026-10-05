"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/merchandise/ProductCard";
import { useMerchBrowseAnalytics } from "@/hooks/useMerchBrowseAnalytics";
import { useCategoryCards } from "@/components/merchandise/useCategoryCards";
import {
  FILTER_ALL as ALL,
  FOCUSED_INITIAL_VISIBLE,
  SHOW_MORE_STEP,
  SORT_OPTIONS,
  categoriesNeeded,
  growVisible,
  isSortKey,
  nextBatchSize,
  realBrands,
  searchHaystack,
  searchProducts,
  sortProducts,
  type CatalogProduct,
  type SortKey,
} from "@/lib/merchCatalog";

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
}

const SEARCH_DEBOUNCE_MS = 200;
/** The first row (up to 4 cards) is on screen on a desktop and is the LCP candidate there. */
const PRIORITY_CARDS = 4;

const controlClasses =
  "rounded-md border border-gold/25 bg-cream px-3 py-2.5 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60";

/**
 * Search, sort, brand filter and "Show more" for one category's landing page.
 * Same behavior and shareable URL params (?q=&sort=&brand=) as the main
 * catalog, minus the category chips.
 */
export default function CategoryProductGrid({
  products: initialProducts,
  category,
  total: totalProp,
  brands: brandsProp,
}: CategoryProductGridProps) {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [brand, setBrand] = useState<string>(ALL);
  const filterKey = `${brand}|${query}|${sort}`;
  const [disclosure, setDisclosure] = useState<{ key: string; count: number }>({
    key: filterKey,
    count: FOCUSED_INITIAL_VISIBLE,
  });
  const [urlReady, setUrlReady] = useState(false);
  // True while "Show more" waits for the rest of the category to arrive.
  const [busy, setBusy] = useState(false);
  const { loaded, failed: failedByCategory, load } = useCategoryCards();

  const total = totalProp ?? initialProducts.length;
  const complete = loaded[category] !== undefined || initialProducts.length >= total;
  const products = loaded[category] ?? initialProducts;
  const brands = useMemo(() => brandsProp ?? realBrands(products), [brandsProp, products]);
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

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(queryInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  // Restore shareable state on first mount (in an effect so SSR markup matches).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialBrand = params.get("brand");
    const initialSort = params.get("sort");
    const initialQuery = params.get("q");
    if (initialBrand && brands.includes(initialBrand)) setBrand(initialBrand);
    if (isSortKey(initialSort)) setSort(initialSort);
    if (initialQuery) {
      setQueryInput(initialQuery);
      setQuery(initialQuery.trim());
    }
    setUrlReady(true);
  }, [brands]);

  useEffect(() => {
    if (!urlReady) return;
    const url = new URL(window.location.href);
    const entries: [string, string | null][] = [
      ["brand", brand === ALL ? null : brand],
      ["sort", sort === "featured" ? null : sort],
      ["q", query || null],
    ];
    for (const [key, value] of entries) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [urlReady, brand, sort, query]);

  // Searching, brand-filtering and sorting need the whole category. Until it
  // is here the page keeps showing the unfiltered first cards with a
  // "Loading" note, never a half-filtered list.
  const needsAll = categoriesNeeded({ category: ALL, brand, query, sort }, [category]).length > 0;
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
    // Ranked by relevance (name, brand, category, color, description).
    const matching = query ? searchProducts(byBrand, query, haystackOf) : byBrand;
    return sortProducts(matching, sort);
  }, [ready, products, brand, query, sort, haystackOf]);

  const hasFilters = brand !== ALL || query !== "" || queryInput !== "";
  // Without a search, brand filter or sort the view is the whole category,
  // so its size is the real total even while only the first cards are here.
  const resultCount = ready && needsAll ? results.length : total;
  const visible = disclosure.key === filterKey ? disclosure.count : FOCUSED_INITIAL_VISIBLE;
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
    setQueryInput("");
    setQuery("");
    setBrand(ALL);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          type="search"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          onFocus={warm}
          placeholder={`Search ${category.toLowerCase()}`}
          aria-label={`Search ${category}`}
          className={`${controlClasses} col-span-2 w-full sm:col-span-1`}
        />
        <label className="min-w-0">
          <span className="sr-only">Sort products</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            onFocus={warm}
            onPointerDown={warm}
            className={`${controlClasses} w-full font-medium`}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {brands.length > 0 && (
          <label className="min-w-0">
            <span className="sr-only">Filter by brand</span>
            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              onFocus={warm}
              onPointerDown={warm}
              className={`${controlClasses} w-full font-medium`}
            >
              <option value={ALL}>All Brands</option>
              {brands.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-5 flex min-h-[2rem] flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-onyx/60">
          {loading
            ? "Loading products…"
            : resultCount === 0
              ? "No products found"
              : `Showing ${resultCount} ${resultCount === 1 ? "product" : "products"}`}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-gold-text underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            Clear filters
          </button>
        )}
      </div>

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
            Try a different search, or clear the filters.
          </p>
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
