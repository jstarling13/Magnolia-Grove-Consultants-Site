"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/merchandise/ProductCard";
import LogoDropzone from "@/components/merchandise/LogoDropzone";
import RecentlyViewed from "@/components/merchandise/RecentlyViewed";
import { useMerchBrowseAnalytics } from "@/hooks/useMerchBrowseAnalytics";
import { categoryPath } from "@/lib/merchSlug";
import {
  FOCUSED_INITIAL_VISIBLE,
  INITIAL_VISIBLE,
  SORT_OPTIONS,
  SHOW_MORE_STEP,
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

interface ProductCatalogProps {
  /** Slim card products in "featured" order. */
  products: CatalogProduct[];
  /** Categories in display order. */
  categories: string[];
}

const ALL = "All";
const SEARCH_DEBOUNCE_MS = 200;
/** Cards in the first row of the first section load eagerly. */
const PRIORITY_CARDS = 4;

const controlClasses =
  "rounded-md border border-gold/25 bg-cream px-3 py-2.5 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function slug(category: string): string {
  return `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export default function ProductCatalog({ products, categories }: ProductCatalogProps) {
  const [queryInput, setQueryInput] = useState("");
  const query = useDebouncedValue(queryInput, SEARCH_DEBOUNCE_MS).trim();
  const [sort, setSort] = useState<SortKey>("featured");
  const [category, setCategory] = useState<string>(ALL);
  const [brand, setBrand] = useState<string>(ALL);
  // Visible-count state is tagged with the filter it belongs to, so changing
  // any filter naturally starts every section back at its initial size.
  const filterKey = `${category}|${brand}|${query}|${sort}`;
  const [disclosure, setDisclosure] = useState<{ key: string; counts: Record<string, number> }>({
    key: filterKey,
    counts: {},
  });
  // Flips once the URL has been read, so we never overwrite it with defaults.
  const [urlReady, setUrlReady] = useState(false);

  // The chip bar sticks just below the site header, whatever height it has at
  // this breakpoint.
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const update = () => setHeaderHeight(Math.round(header.getBoundingClientRect().height));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const haystacks = useMemo(
    () => new Map(products.map((product) => [product.id, searchHaystack(product)])),
    [products]
  );

  const brands = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.brand)))
        .filter(isRealBrand)
        .sort((a, b) => a.localeCompare(b)),
    [products]
  );

  // Restore shareable state (?category=&q=&sort=&brand=) on first mount. Done
  // in an effect, not during render, so server and client markup match.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialCategory = params.get("category");
    const initialBrand = params.get("brand");
    const initialSort = params.get("sort");
    const initialQuery = params.get("q");
    if (initialCategory && categories.includes(initialCategory)) setCategory(initialCategory);
    if (initialBrand && brands.includes(initialBrand)) setBrand(initialBrand);
    if (isSortKey(initialSort)) setSort(initialSort);
    if (initialQuery) setQueryInput(initialQuery);
    setUrlReady(true);
  }, [categories, brands]);

  useEffect(() => {
    if (!urlReady) return;
    const url = new URL(window.location.href);
    const entries: [string, string | null][] = [
      ["category", category === ALL ? null : category],
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
  }, [urlReady, category, brand, sort, query]);

  // Search + brand narrow the result set; the category chips then slice it.
  const matching = useMemo(
    () =>
      products.filter(
        (product) =>
          (brand === ALL || product.brand === brand) &&
          (!query || matchesQuery(haystacks.get(product.id) ?? "", query))
      ),
    [products, brand, query, haystacks]
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const product of matching) result[product.category] = (result[product.category] ?? 0) + 1;
    return result;
  }, [matching]);

  const groups = useMemo(() => {
    const sorted = sortProducts(matching, sort);
    const byCategory = new Map<string, CatalogProduct[]>();
    for (const product of sorted) {
      const list = byCategory.get(product.category);
      if (list) list.push(product);
      else byCategory.set(product.category, [product]);
    }
    return categories
      .filter((name) => (category === ALL || name === category) && byCategory.has(name))
      .map((name) => ({ category: name, items: byCategory.get(name)! }));
  }, [matching, sort, categories, category]);

  const resultCount = groups.reduce((sum, group) => sum + group.items.length, 0);
  const hasFilters = category !== ALL || brand !== ALL || query !== "" || queryInput !== "";
  const initialVisible = category === ALL ? INITIAL_VISIBLE : FOCUSED_INITIAL_VISIBLE;
  const visibleCounts = disclosure.key === filterKey ? disclosure.counts : {};
  useMerchBrowseAnalytics(
    category === ALL ? "All products" : category,
    () => groups.flatMap((group) => group.items.slice(0, initialVisible)),
    query
  );

  const setVisible = useCallback(
    (name: string, count: number) =>
      setDisclosure((prev) => ({
        key: filterKey,
        counts: { ...(prev.key === filterKey ? prev.counts : {}), [name]: count },
      })),
    [filterKey]
  );

  function clearFilters() {
    setQueryInput("");
    setBrand(ALL);
    setCategory(ALL);
  }

  function collapse(name: string) {
    setVisible(name, initialVisible);
    document.getElementById(slug(name))?.scrollIntoView({ block: "start" });
  }

  return (
    <div>
      <div className="mb-10">
        <LogoDropzone />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          type="search"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          placeholder="Search products, brands or colors"
          aria-label="Search products"
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
      </div>

      {/* Category chips: sticky below the site header so they stay reachable at 500 products. */}
      <div
        style={{ top: headerHeight }}
        className="sticky z-30 -mx-6 mt-4 border-b border-gold/20 bg-cream/95 px-6 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12"
      >
        <div
          role="group"
          aria-label="Filter by category"
          className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <CategoryChip
            label="All"
            count={matching.length}
            active={category === ALL}
            onClick={() => setCategory(ALL)}
          />
          {categories.map((name) => (
            <CategoryChip
              key={name}
              label={name}
              count={counts[name] ?? 0}
              active={category === name}
              onClick={() => setCategory(name)}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex min-h-[2rem] flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-onyx/60">
          {resultCount === 0
            ? "No products found"
            : `Showing ${resultCount} ${resultCount === 1 ? "product" : "products"}${
                category === ALL ? "" : ` in ${category}`
              }`}
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

      {resultCount === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gold/40 px-6 py-14 text-center">
          <p className="text-base font-semibold text-onyx">No products match your filters.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-onyx/60">
            Try a different search, or clear the filters. If it still isn&apos;t here, request it
            and we&apos;ll source it for you.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-md border border-gold/40 px-5 py-2.5 text-sm font-semibold text-onyx transition-colors hover:border-gold hover:bg-gold/10"
              >
                Clear filters
              </button>
            )}
            <a
              href="#request"
              className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright"
            >
              Request a product
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-14">
          {!hasFilters && <RecentlyViewed />}
          {groups.map(({ category: name, items }, groupIndex) => {
            const shown = Math.min(visibleCounts[name] ?? initialVisible, items.length);
            const batch = nextBatchSize(shown, items.length);
            return (
              <section
                key={name}
                id={slug(name)}
                aria-labelledby={`${slug(name)}-heading`}
                className="scroll-mt-44"
              >
                <div className="flex items-baseline justify-between border-b border-gold/20 pb-2">
                  <h2
                    id={`${slug(name)}-heading`}
                    className="font-heading text-lg uppercase tracking-wide text-onyx/80"
                  >
                    {name}
                  </h2>
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-medium text-onyx/50">
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                    <Link
                      href={categoryPath(name)}
                      aria-label={`View all ${name}`}
                      className="text-xs font-semibold text-gold-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                    >
                      View all
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                  {items.slice(0, shown).map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priority={groupIndex === 0 && index < PRIORITY_CARDS}
                    />
                  ))}
                </div>

                {items.length > initialVisible && (
                  <div className="mt-8 flex flex-col items-center gap-3">
                    <p className="text-xs text-onyx/50" aria-live="polite">
                      Showing {shown} of {items.length}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {batch > 0 && (
                        <button
                          type="button"
                          aria-label={`Show ${batch} more ${name} ${batch === 1 ? "product" : "products"}`}
                          onClick={() =>
                            setVisible(name, growVisible(shown, items.length, SHOW_MORE_STEP))
                          }
                          className="rounded-md border border-gold/40 px-6 py-2.5 text-sm font-semibold text-onyx transition-colors hover:border-gold hover:bg-gold/10"
                        >
                          Show {batch} more
                        </button>
                      )}
                      {shown > initialVisible && (
                        <button
                          type="button"
                          onClick={() => collapse(name)}
                          className="rounded-md px-4 py-2.5 text-sm font-semibold text-onyx/60 transition-colors hover:text-onyx"
                        >
                          Show fewer
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const disabled = count === 0 && !active;
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-onyx bg-onyx text-white"
          : "border-gold/30 bg-cream text-onyx/80 hover:border-gold hover:text-onyx"
      }`}
    >
      {label}
      <span className={`text-xs tabular-nums ${active ? "text-white/70" : "text-onyx/50"}`}>
        {count}
      </span>
    </button>
  );
}
