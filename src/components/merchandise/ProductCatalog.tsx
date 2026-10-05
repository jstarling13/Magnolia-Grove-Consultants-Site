"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import ProductCard from "@/components/merchandise/ProductCard";
import LogoDropzone from "@/components/merchandise/LogoDropzone";
import RecentlyViewed from "@/components/merchandise/RecentlyViewed";
import { useMerchBrowseAnalytics } from "@/hooks/useMerchBrowseAnalytics";
import { useCategoryCards } from "@/components/merchandise/useCategoryCards";
import { categoryPath } from "@/lib/merchSlug";
import {
  FILTER_ALL as ALL,
  FOCUSED_INITIAL_VISIBLE,
  INITIAL_VISIBLE,
  SORT_OPTIONS,
  SHOW_MORE_STEP,
  categoriesNeeded,
  countByCategory,
  growVisible,
  isSortKey,
  nextBatchSize,
  realBrands,
  searchHaystack,
  searchProducts,
  sortProducts,
  type CatalogProduct,
  type CatalogView,
  type SortKey,
} from "@/lib/merchCatalog";

interface ProductCatalogProps {
  /**
   * Card products in "featured" order. The page ships just the first cards of
   * each category; the rest of a category is fetched on demand. Passing the
   * whole catalog also works (nothing is then fetched).
   */
  products: CatalogProduct[];
  /** Categories in display order. */
  categories: string[];
  /** Full size of each category. Defaults to counting `products`. */
  categoryTotals?: Record<string, number>;
  /** Every real brand in the full catalog. Defaults to the brands in `products`. */
  brands?: string[];
}

const SEARCH_DEBOUNCE_MS = 200;
/** Wait this long after hydration before fetching the rest of the catalog. */
const PREFETCH_DELAY_MS = 3000;

/**
 * Sections after the first skip layout and paint until they near the screen
 * (content-visibility), which is most of the page's first-render cost. While
 * skipped a section is as tall as contain-intrinsic-size says, so it is
 * estimated from its card count and the card geometry at each breakpoint
 * (photo width + about 294px for text and gaps, per row of 1/2/3/4 cards); once
 * seen, the browser remembers the real height. The padding and negative margins
 * give the cards' hover shadow room inside the paint-clipped box without
 * moving anything.
 */
const SKIPPABLE_CLASSES =
  "-mx-5 -mb-8 -mt-3 px-5 pb-8 pt-3 [content-visibility:auto] " +
  "[contain-intrinsic-size:auto_calc(4px_+_var(--rows-1)_*_(0.75_*_(100vw_-_48px)_+_290px))] " +
  "sm:[contain-intrinsic-size:auto_calc(var(--rows-2)_*_((100vw_-_88px)_/_2_+_294px))] " +
  "lg:[contain-intrinsic-size:auto_calc(var(--rows-3)_*_((100vw_-_144px)_/_3_+_294px))] " +
  "xl:[contain-intrinsic-size:auto_calc(var(--rows-4)_*_((min(100vw_-_96px,_1440px)_-_72px)_/_4_+_294px))]";

function skippableStyle(cards: number): CSSProperties {
  return {
    "--rows-1": cards,
    "--rows-2": Math.ceil(cards / 2),
    "--rows-3": Math.ceil(cards / 3),
    "--rows-4": Math.ceil(cards / 4),
  } as CSSProperties;
}

const controlClasses =
  "rounded-md border border-gold/25 bg-cream px-3 py-2.5 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60";

/** What the page shows while the data a filter needs is still on its way. */
const BASE_VIEW: CatalogView = { category: ALL, brand: ALL, query: "", sort: "featured" };
const NO_COUNTS: Record<string, number> = {};

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

interface Group {
  category: string;
  /** The cards known so far (all of them once the category has loaded). */
  items: CatalogProduct[];
  /** How many products match, including cards that have not loaded yet. */
  total: number;
}

export default function ProductCatalog({
  products,
  categories,
  categoryTotals,
  brands: brandsProp,
}: ProductCatalogProps) {
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
  // Category whose "Show more" is waiting for its cards to arrive.
  const [busy, setBusy] = useState<string | null>(null);
  const { loaded, failed: failedByCategory, load } = useCategoryCards();

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

  const totals = useMemo(
    () => categoryTotals ?? countByCategory(products),
    [categoryTotals, products]
  );
  const brands = useMemo(() => brandsProp ?? realBrands(products), [brandsProp, products]);
  const initialByCategory = useMemo(() => {
    const map = new Map<string, CatalogProduct[]>();
    for (const product of products) {
      const list = map.get(product.category);
      if (list) list.push(product);
      else map.set(product.category, [product]);
    }
    return map;
  }, [products]);

  const isComplete = useCallback(
    (name: string) =>
      loaded[name] !== undefined ||
      (initialByCategory.get(name)?.length ?? 0) >= (totals[name] ?? 0),
    [loaded, initialByCategory, totals]
  );
  // Handlers below read the latest answer without changing identity.
  const isCompleteRef = useRef(isComplete);
  isCompleteRef.current = isComplete;
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  /** Starts fetching categories that are not fully here yet (hover, focus). */
  const warm = useCallback(
    (names?: readonly string[]) => {
      const missing = (names ?? categoriesRef.current).filter(
        (name) => !isCompleteRef.current(name)
      );
      if (missing.length > 0) void load(missing);
    },
    [load]
  );

  // Quietly fetch the rest of the catalog once the page has settled, so the
  // first search or sort is instant instead of waiting on the network. Skipped
  // when the shopper asked to save data or is on a very slow connection.
  useEffect(() => {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
    let idle: number | undefined;
    const timer = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => warm(), { timeout: 4000 });
      } else {
        warm();
      }
    }, PREFETCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, [warm]);

  // Every card we know about, in featured order (categories in display order).
  const known = useMemo(
    () => categories.flatMap((name) => loaded[name] ?? initialByCategory.get(name) ?? []),
    [categories, loaded, initialByCategory]
  );
  const haystacks = useRef(new Map<string, string>());
  const haystackOf = useCallback((product: CatalogProduct) => {
    let text = haystacks.current.get(product.id);
    if (text === undefined) {
      text = searchHaystack(product);
      haystacks.current.set(product.id, text);
    }
    return text;
  }, []);

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

  // Fetch whatever the chosen filters need. Until it is here the page keeps
  // showing the unfiltered view with a "Loading" note, never a half-filtered one.
  const needed = categoriesNeeded({ category, brand, query, sort }, categories);
  const missing = needed.filter((name) => !isComplete(name));
  const missingKey = missing.join("|");
  useEffect(() => {
    if (missingKey) void load(missingKey.split("|"));
  }, [missingKey, load]);
  const ready = missing.length === 0;
  const failed = missing.some((name) => failedByCategory[name]);
  const loading = !ready && !failed;
  const view: CatalogView = ready ? { category, brand, query, sort } : BASE_VIEW;

  // Search + brand narrow the result set; the category chips then slice it.
  const narrowing = view.brand !== ALL || view.query !== "";
  const matching = useMemo(() => {
    if (!narrowing) return known;
    const byBrand =
      view.brand === ALL ? known : known.filter((product) => product.brand === view.brand);
    // Ranked by relevance (name, brand, category, color, description).
    return view.query ? searchProducts(byBrand, view.query, haystackOf) : byBrand;
  }, [narrowing, known, view.brand, view.query, haystackOf]);

  // Unfiltered counts come from the server totals so they are right before
  // the rest of a category has loaded.
  const counts = useMemo(
    () => (narrowing ? countByCategory(matching) : totals),
    [narrowing, matching, totals]
  );
  const allCount = narrowing
    ? matching.length
    : categories.reduce((sum, name) => sum + (totals[name] ?? 0), 0);

  const groups = useMemo<Group[]>(() => {
    const sorted = sortProducts(matching, view.sort);
    const byCategory = new Map<string, CatalogProduct[]>();
    for (const product of sorted) {
      const list = byCategory.get(product.category);
      if (list) list.push(product);
      else byCategory.set(product.category, [product]);
    }
    return categories
      .filter(
        (name) => (view.category === ALL || name === view.category) && (counts[name] ?? 0) > 0
      )
      .map((name) => ({
        category: name,
        items: byCategory.get(name) ?? [],
        total: counts[name] ?? 0,
      }));
  }, [matching, view.sort, view.category, categories, counts]);

  const resultCount = groups.reduce((sum, group) => sum + group.total, 0);
  const hasFilters = category !== ALL || brand !== ALL || query !== "" || queryInput !== "";
  const initialVisible = view.category === ALL ? INITIAL_VISIBLE : FOCUSED_INITIAL_VISIBLE;
  const visibleCounts = disclosure.key === filterKey ? disclosure.counts : NO_COUNTS;
  useMerchBrowseAnalytics(
    view.category === ALL ? "All products" : view.category,
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

  const showMore = useCallback(
    async (name: string, shown: number, total: number) => {
      if (!isCompleteRef.current(name)) {
        setBusy(name);
        const ok = await load([name]);
        setBusy(null);
        if (!ok) return;
      }
      setVisible(name, growVisible(shown, total, SHOW_MORE_STEP));
    },
    [load, setVisible]
  );

  const collapse = useCallback(
    (name: string) => {
      setVisible(name, initialVisible);
      document.getElementById(slug(name))?.scrollIntoView({ block: "start" });
    },
    [setVisible, initialVisible]
  );

  function clearFilters() {
    setQueryInput("");
    setBrand(ALL);
    setCategory(ALL);
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
          onFocus={() => warm()}
          placeholder="Search products, brands or colors"
          aria-label="Search products"
          className={`${controlClasses} col-span-2 w-full sm:col-span-1`}
        />
        <label className="min-w-0">
          <span className="sr-only">Sort products</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            onFocus={() => warm()}
            onPointerDown={() => warm()}
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
            onFocus={() => warm()}
            onPointerDown={() => warm()}
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
            count={allCount}
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
              onIntent={() => warm([name])}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex min-h-[2rem] flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-onyx/60">
          {loading
            ? "Loading products…"
            : resultCount === 0
              ? "No products found"
              : `Showing ${resultCount} ${resultCount === 1 ? "product" : "products"}${
                  view.category === ALL ? "" : ` in ${view.category}`
                }`}
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

      {failed && !ready && (
        <p role="alert" className="mt-3 text-sm text-onyx/70">
          We couldn&apos;t load the full catalog.{" "}
          <button
            type="button"
            onClick={() => void load(missing)}
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
        <div aria-busy={loading} className="mt-8 space-y-14">
          {!hasFilters && <RecentlyViewed />}
          <CatalogSections
            groups={groups}
            visibleCounts={visibleCounts}
            initialVisible={initialVisible}
            busy={busy}
            onShowMore={showMore}
            onCollapse={collapse}
            onIntent={warm}
          />
        </div>
      )}
    </div>
  );
}

interface CatalogSectionsProps {
  groups: Group[];
  visibleCounts: Record<string, number>;
  initialVisible: number;
  busy: string | null;
  onShowMore: (name: string, shown: number, total: number) => void;
  onCollapse: (name: string) => void;
  onIntent: (names: readonly string[]) => void;
}

/**
 * The category sections and their cards. Memoised and fed only stable props,
 * so a keystroke in the search box (which re-renders the catalog shell) does
 * not walk every card; the sections re-render when the results change.
 */
const CatalogSections = memo(function CatalogSections({
  groups,
  visibleCounts,
  initialVisible,
  busy,
  onShowMore,
  onCollapse,
  onIntent,
}: CatalogSectionsProps) {
  return (
    <>
      {groups.map(({ category: name, items, total }, groupIndex) => {
        const shown = Math.min(visibleCounts[name] ?? initialVisible, total);
        const batch = nextBatchSize(shown, total);
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
                <span className="text-xs font-medium text-onyx/60">
                  {total} {total === 1 ? "item" : "items"}
                </span>
                <Link
                  href={categoryPath(name)}
                  aria-label={`View all ${name}`}
                  className="text-xs font-semibold text-gold-text underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                >
                  View all
                </Link>
              </div>
            </div>

            <div
              className={groupIndex > 0 ? SKIPPABLE_CLASSES : undefined}
              style={groupIndex > 0 ? skippableStyle(Math.min(shown, items.length)) : undefined}
            >
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {items.slice(0, shown).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>

            {total > initialVisible && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-xs text-onyx/60" aria-live="polite">
                  Showing {shown} of {total}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {batch > 0 && (
                    <button
                      type="button"
                      aria-label={`Show ${batch} more ${name} ${batch === 1 ? "product" : "products"}`}
                      aria-busy={busy === name}
                      disabled={busy === name}
                      onPointerEnter={() => onIntent([name])}
                      onFocus={() => onIntent([name])}
                      onClick={() => onShowMore(name, shown, total)}
                      className="rounded-md border border-gold/40 px-6 py-2.5 text-sm font-semibold text-onyx transition-colors hover:border-gold hover:bg-gold/10 disabled:cursor-wait disabled:opacity-60"
                    >
                      {busy === name ? "Loading…" : `Show ${batch} more`}
                    </button>
                  )}
                  {shown > initialVisible && (
                    <button
                      type="button"
                      onClick={() => onCollapse(name)}
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
    </>
  );
});

function CategoryChip({
  label,
  count,
  active,
  onClick,
  onIntent,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  /** Hover or focus: a click is likely, so start loading that category. */
  onIntent?: () => void;
}) {
  const disabled = count === 0 && !active;
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-onyx bg-onyx text-white"
          : "border-gold/30 bg-cream text-onyx/80 hover:border-gold hover:text-onyx"
      }`}
    >
      {label}
      <span className={`text-xs tabular-nums ${active ? "text-white/70" : "text-onyx/60"}`}>
        {count}
      </span>
    </button>
  );
}
