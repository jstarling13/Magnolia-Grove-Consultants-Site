"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  FILTER_ALL as ALL,
  formatQuantity,
  MANY_COLORS,
  MIN_QTY_CHOICES,
  SORT_OPTIONS,
  type ProductFilters,
  type SortKey,
} from "@/lib/merchCatalog";
import {
  samePriceRange,
  priceRangeLabel,
  type FilterChip,
  type PriceBucket,
} from "@/lib/merchFilters";

/** Every control is at least 44px tall, the touch target size on a phone. */
const controlClasses =
  "min-h-[44px] rounded-md border border-gold/25 bg-cream px-3 py-2.5 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60";
const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";
const choiceClasses = "flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-onyx";
const inputClasses = "h-5 w-5 shrink-0 cursor-pointer accent-onyx";

function toggleId(idPrefix: string): string {
  return `${idPrefix}-filters-toggle`;
}

/** Puts focus back on the Filters button, which is always on the page. */
export function focusFilterToggle(idPrefix: string): void {
  document.getElementById(toggleId(idPrefix))?.focus();
}

interface FilterToolbarProps {
  /** Distinguishes ids when more than one catalog is on a page. */
  idPrefix: string;
  searchValue: string;
  onSearch: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  brand: string;
  brands: readonly string[];
  onBrand: (brand: string) => void;
  filters: ProductFilters;
  onFilters: (filters: ProductFilters) => void;
  priceBuckets: readonly PriceBucket[];
  /** Hover or focus on a control: the rest of the catalog is about to be needed. */
  onIntent: () => void;
}

/**
 * Search, sort and brand, plus a "Filters" disclosure holding the rest
 * (made in USA, price, minimum order, colors, photos). The disclosure is in
 * the page flow, not a dialog, so nothing traps focus: Escape or "Done"
 * closes it and returns focus to its button. It is rendered closed on the
 * server, so the first paint is the same with or without the filters.
 */
export function FilterToolbar({
  idPrefix,
  searchValue,
  onSearch,
  searchLabel,
  searchPlaceholder,
  sort,
  onSort,
  brand,
  brands,
  onBrand,
  filters,
  onFilters,
  priceBuckets,
  onIntent,
}: FilterToolbarProps) {
  const [open, setOpen] = useState(false);
  const panelId = `${idPrefix}-filters-panel`;
  const radioGroup = useId();
  const panelCount =
    Number(filters.usa) +
    Number(filters.photos) +
    Number(filters.manyColors) +
    Number(filters.minQty !== null) +
    Number(filters.price !== null);
  const hasBrands = brands.length > 0;

  function close() {
    setOpen(false);
    focusFilterToggle(idPrefix);
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  }

  // A range from a shared link that is not one of the buckets still shows,
  // selected, so the panel always agrees with the chip.
  const customRange =
    filters.price && !priceBuckets.some((bucket) => samePriceRange(bucket, filters.price))
      ? filters.price
      : null;

  return (
    <div>
      <div
        className={`grid grid-cols-2 gap-3 ${
          hasBrands
            ? "sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
            : "sm:grid-cols-[minmax(0,1fr)_auto_auto]"
        }`}
      >
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearch(event.target.value)}
          onFocus={() => onIntent()}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          className={`${controlClasses} col-span-2 w-full sm:col-span-1`}
        />
        <label className="min-w-0">
          <span className="sr-only">Sort products</span>
          <select
            value={sort}
            onChange={(event) => onSort(event.target.value as SortKey)}
            onFocus={() => onIntent()}
            onPointerDown={() => onIntent()}
            className={`${controlClasses} w-full font-medium`}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {hasBrands && (
          <label className="min-w-0">
            <span className="sr-only">Filter by brand</span>
            <select
              value={brand}
              onChange={(event) => onBrand(event.target.value)}
              onFocus={() => onIntent()}
              onPointerDown={() => onIntent()}
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
        <button
          id={toggleId(idPrefix)}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen((value) => !value);
            onIntent();
          }}
          onPointerEnter={() => onIntent()}
          className={`${controlClasses} font-medium ${hasBrands ? "col-span-2 sm:col-span-1" : ""} ${
            open ? "border-onyx" : "hover:border-gold"
          }`}
        >
          Filters{panelCount > 0 ? ` (${panelCount})` : ""}
        </button>
      </div>

      <div
        id={panelId}
        role="group"
        aria-label="Product filters"
        hidden={!open}
        onKeyDown={onPanelKeyDown}
        className="mt-3 rounded-lg border border-gold/25 bg-cream-100/60 p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <fieldset>
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-onyx/60">
              Product
            </legend>
            <label className={choiceClasses}>
              <input
                type="checkbox"
                checked={filters.usa}
                onChange={(event) => onFilters({ ...filters, usa: event.target.checked })}
                className={inputClasses}
              />
              Made in USA
            </label>
            <label className={choiceClasses}>
              <input
                type="checkbox"
                checked={filters.manyColors}
                onChange={(event) => onFilters({ ...filters, manyColors: event.target.checked })}
                className={inputClasses}
              />
              {MANY_COLORS}+ colors
            </label>
            <label className={choiceClasses}>
              <input
                type="checkbox"
                checked={filters.photos}
                onChange={(event) => onFilters({ ...filters, photos: event.target.checked })}
                className={inputClasses}
              />
              Has color photos
            </label>
          </fieldset>

          {(priceBuckets.length > 0 || customRange) && (
            <fieldset>
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-onyx/60">
                Price per unit
              </legend>
              <label className={choiceClasses}>
                <input
                  type="radio"
                  name={`${radioGroup}-price`}
                  checked={filters.price === null}
                  onChange={() => onFilters({ ...filters, price: null })}
                  className={inputClasses}
                />
                Any price
              </label>
              {priceBuckets.map((bucket) => (
                <label key={bucket.label} className={choiceClasses}>
                  <input
                    type="radio"
                    name={`${radioGroup}-price`}
                    checked={samePriceRange(bucket, filters.price)}
                    onChange={() =>
                      onFilters({ ...filters, price: { min: bucket.min, max: bucket.max } })
                    }
                    className={inputClasses}
                  />
                  {bucket.label}
                </label>
              ))}
              {customRange && (
                <label className={choiceClasses}>
                  <input
                    type="radio"
                    name={`${radioGroup}-price`}
                    checked
                    onChange={() => undefined}
                    className={inputClasses}
                  />
                  {priceRangeLabel(customRange)}
                </label>
              )}
            </fieldset>
          )}

          <fieldset>
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-onyx/60">
              Minimum order
            </legend>
            <label className={choiceClasses}>
              <input
                type="radio"
                name={`${radioGroup}-minqty`}
                checked={filters.minQty === null}
                onChange={() => onFilters({ ...filters, minQty: null })}
                className={inputClasses}
              />
              Any quantity
            </label>
            {MIN_QTY_CHOICES.map((quantity) => (
              <label key={quantity} className={choiceClasses}>
                <input
                  type="radio"
                  name={`${radioGroup}-minqty`}
                  checked={filters.minQty === quantity}
                  onChange={() => onFilters({ ...filters, minQty: quantity })}
                  className={inputClasses}
                />
                {formatQuantity(quantity)} units or fewer
              </label>
            ))}
          </fieldset>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={close}
            className={`min-h-[44px] rounded-md border border-gold/40 px-6 py-2.5 text-sm font-semibold text-onyx transition-colors hover:border-gold hover:bg-gold/10 ${focusRing}`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface FilterStatusProps {
  idPrefix: string;
  /** "Showing 12 products", or the loading and empty messages. */
  statusText: string;
  chips: readonly FilterChip[];
  onRemoveChip: (chip: FilterChip) => void;
  /** Anything is set that Clear all would reset (the category counts too). */
  canClear: boolean;
  onClearAll: () => void;
}

/**
 * The result count (a polite live region, so a screen reader hears it after
 * every change), the active filters as removable chips, and "Clear all".
 * Taking a chip off moves focus to the next chip, or to the Filters button
 * after the last one, so keyboard focus never lands on nothing.
 */
export function FilterStatus({
  idPrefix,
  statusText,
  chips,
  onRemoveChip,
  canClear,
  onClearAll,
}: FilterStatusProps) {
  const list = useRef<HTMLUListElement>(null);
  const focusAfter = useRef<string | null>(null);

  useEffect(() => {
    const key = focusAfter.current;
    if (key === null) return;
    focusAfter.current = null;
    const target = key
      ? list.current?.querySelector<HTMLElement>(`[data-chip="${key}"]`)
      : document.getElementById(toggleId(idPrefix));
    (target ?? document.getElementById(toggleId(idPrefix)))?.focus();
  }, [chips, idPrefix]);

  function remove(index: number) {
    const neighbour = chips[index + 1] ?? chips[index - 1];
    focusAfter.current = neighbour ? neighbour.key : "";
    onRemoveChip(chips[index]);
  }

  return (
    <>
      <div className="mt-5 flex min-h-[44px] flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-onyx/60">
          {statusText}
        </p>
        {canClear && (
          <button
            type="button"
            onClick={() => {
              onClearAll();
              focusFilterToggle(idPrefix);
            }}
            className={`min-h-[44px] px-2 text-sm font-semibold text-gold-text underline-offset-2 hover:underline ${focusRing}`}
          >
            Clear all
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <ul ref={list} aria-label="Active filters" className="mt-1 flex flex-wrap gap-2">
          {chips.map((chip, index) => (
            <li key={chip.key} className="min-w-0 max-w-full">
              <button
                type="button"
                data-chip={chip.key}
                aria-label={`Remove filter: ${chip.label}`}
                onClick={() => remove(index)}
                className={`inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-full border border-onyx bg-onyx px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-onyx-100 ${focusRing}`}
              >
                <span className="truncate">{chip.label}</span>
                <span aria-hidden="true" className="text-base leading-none text-white/70">
                  &times;
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
