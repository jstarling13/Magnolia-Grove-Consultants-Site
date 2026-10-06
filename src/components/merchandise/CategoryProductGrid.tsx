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
  CARD_GRID_CLASSES,
  TypeChips,
  TypeSections,
} from "@/components/merchandise/ProductTypeNav";
import {
  FILTER_ALL as ALL,
  FOCUSED_INITIAL_VISIBLE,
  NO_FILTERS,
  SHOW_MORE_STEP,
  blockTotalsFor,
  categoriesNeeded,
  filterByType,
  filterProducts,
  growVisible,
  hasProductFilters,
  nextBatchSize,
  realBrands,
  searchHaystack,
  searchProducts,
  sortProducts,
  summarizeCardTypes,
  type CatalogProduct,
  type TypeSummary,
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
  /** The category's product types with full counts, in display order. Defaults to the types of `products`. */
  types?: TypeSummary[];
  /** Full size of the brand blocks among the first cards, by blockKey. Defaults to counting `products`. */
  blockTotals?: Record<string, number>;
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
  types: typesProp,
  blockTotals: blockTotalsProp,
}: CategoryProductGridProps) {
  const [disclosure, setDisclosure] = useState<{ key: string; count: number } | null>(null);
  // True while "Show more" waits for the rest of the category to arrive.
  const [busy, setBusy] = useState(false);
  const { loaded, failed: failedByCategory, load } = useCategoryCards();

  const total = totalProp ?? initialProducts.length;
  const complete = loaded[category] !== undefined || initialProducts.length >= total;
  const products = loaded[category] ?? initialProducts;
  const brands = useMemo(() => brandsProp ?? realBrands(products), [brandsProp, products]);
  const types = useMemo(() => typesProp ?? summarizeCardTypes(products), [typesProp, products]);
  const typeLabels = useMemo(() => types.map((type) => type.label), [types]);
  const hasTypes = types.length > 0 && products.some((product) => product.type);
  const { params, queryInput, onQueryInput, update } = useCatalogParams({
    brands,
    types: typeLabels,
  });
  const { brand, type, query, sort, filters } = params;
  const filterKey = `${brand}|${type}|${query}|${sort}|${filtersKey(filters)}`;
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
    categoriesNeeded({ category: ALL, brand, type, query, sort, filters }, [category]).length > 0;
  const ready = complete || !needsAll;
  const failed = !ready && Boolean(failedByCategory[category]);
  const loading = !ready && !failed;
  useEffect(() => {
    if (needsAll && !complete) void load([category]);
  }, [needsAll, complete, load, category]);

  // Brand, search and product filters narrow the category; the type chips then
  // slice what is left, so each chip's count is what choosing it would show.
  const narrowed = useMemo(() => {
    if (!ready) return products;
    const byBrand =
      brand === ALL ? products : products.filter((product) => product.brand === brand);
    const byFilters = filterProducts(byBrand, filters);
    // Ranked by relevance (name, brand, category, color, description); the
    // sort keeps that ranking as its tie-break.
    return query ? searchProducts(byFilters, query, haystackOf) : byFilters;
  }, [ready, products, brand, query, filters, haystackOf]);
  const results = useMemo(
    () => (ready ? sortProducts(filterByType(narrowed, type), sort) : products),
    [ready, narrowed, products, type, sort]
  );
  const narrowing = ready && (brand !== ALL || query !== "" || hasProductFilters(filters));
  const chipTypes = useMemo<TypeSummary[]>(() => {
    if (!narrowing) return types;
    const counts = summarizeCardTypes(narrowed);
    return types.map((entry) => ({
      ...entry,
      count: counts.find((c) => c.label === entry.label)?.count ?? 0,
    }));
  }, [narrowing, types, narrowed]);
  // The organised view: a sub-heading per type and per brand block. A search or
  // any other sort is one flat list (best matches, cheapest...).
  const sectioned = hasTypes && sort === "featured" && query === "";
  // Counts for the sub-headings: the whole category once it is here, otherwise
  // the totals the server sent for the first cards.
  const known = useMemo(
    () =>
      ready && complete
        ? {
            types: summarizeCardTypes(results),
            blockTotals: blockTotalsFor(results, category),
          }
        : { types, blockTotals: blockTotalsProp ?? blockTotalsFor(products, category) },
    [ready, complete, results, category, types, blockTotalsProp, products]
  );

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
    update({ brand: ALL, type: ALL, query: "", filters: NO_FILTERS });
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

      {hasTypes && (
        <TypeChips
          types={chipTypes}
          active={type}
          allValue={ALL}
          onSelect={(next) => update({ type: next })}
          onIntent={warm}
        />
      )}

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
          {sectioned ? (
            <div className="mt-6">
              <TypeSections
                items={results.slice(0, shown)}
                category={category}
                known={known}
                typeLevel={2}
                priorityCards={PRIORITY_CARDS}
                idPrefix="category"
              />
            </div>
          ) : (
            <div className={`mt-6 ${CARD_GRID_CLASSES}`}>
              {results.slice(0, shown).map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < PRIORITY_CARDS} />
              ))}
            </div>
          )}

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
