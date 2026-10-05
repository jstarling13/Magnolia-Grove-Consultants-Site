"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/merchandise/ProductCard";
import { useMerchBrowseAnalytics } from "@/hooks/useMerchBrowseAnalytics";
import {
  FOCUSED_INITIAL_VISIBLE,
  SHOW_MORE_STEP,
  SORT_OPTIONS,
  growVisible,
  isRealBrand,
  isSortKey,
  matchesQuery,
  nextBatchSize,
  searchHaystack,
  sortProducts,
  type CatalogProduct,
  type SortKey,
} from "@/lib/merchCatalog";

interface CategoryProductGridProps {
  /** Products of one category, in "featured" order. */
  products: CatalogProduct[];
  category: string;
}

const ALL = "All";
const SEARCH_DEBOUNCE_MS = 200;
const PRIORITY_CARDS = 4;

const controlClasses =
  "rounded-md border border-gold/25 bg-cream px-3 py-2.5 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60";

/**
 * Search, sort, brand filter and "Show more" for one category's landing page.
 * Same behavior and shareable URL params (?q=&sort=&brand=) as the main
 * catalog, minus the category chips.
 */
export default function CategoryProductGrid({ products, category }: CategoryProductGridProps) {
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

  const brands = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.brand)))
        .filter(isRealBrand)
        .sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const haystacks = useMemo(
    () => new Map(products.map((product) => [product.id, searchHaystack(product)])),
    [products]
  );

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

  const results = useMemo(() => {
    const matching = products.filter(
      (product) =>
        (brand === ALL || product.brand === brand) &&
        (!query || matchesQuery(haystacks.get(product.id) ?? "", query))
    );
    return sortProducts(matching, sort);
  }, [products, brand, query, sort, haystacks]);

  const hasFilters = brand !== ALL || query !== "" || queryInput !== "";
  const visible = disclosure.key === filterKey ? disclosure.count : FOCUSED_INITIAL_VISIBLE;
  const shown = Math.min(visible, results.length);
  const batch = nextBatchSize(shown, results.length);
  useMerchBrowseAnalytics(category, () => results.slice(0, FOCUSED_INITIAL_VISIBLE), query);

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
          placeholder={`Search ${category.toLowerCase()}`}
          aria-label={`Search ${category}`}
          className={`${controlClasses} col-span-2 w-full sm:col-span-1`}
        />
        <label className="min-w-0">
          <span className="sr-only">Sort products</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
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
          {results.length === 0
            ? "No products found"
            : `Showing ${results.length} ${results.length === 1 ? "product" : "products"}`}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-gold-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            Clear filters
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gold/40 px-6 py-14 text-center">
          <p className="text-base font-semibold text-onyx">No products match your filters.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-onyx/60">
            Try a different search, or clear the filters.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {results.slice(0, shown).map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < PRIORITY_CARDS} />
            ))}
          </div>

          {results.length > FOCUSED_INITIAL_VISIBLE && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-xs text-onyx/50" aria-live="polite">
                Showing {shown} of {results.length}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {batch > 0 && (
                  <button
                    type="button"
                    aria-label={`Show ${batch} more ${batch === 1 ? "product" : "products"}`}
                    onClick={() =>
                      setDisclosure({
                        key: filterKey,
                        count: growVisible(shown, results.length, SHOW_MORE_STEP),
                      })
                    }
                    className="rounded-md border border-gold/40 px-6 py-2.5 text-sm font-semibold text-onyx transition-colors hover:border-gold hover:bg-gold/10"
                  >
                    Show {batch} more
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
        </>
      )}
    </div>
  );
}
