"use client";

import { createElement, useMemo, type ReactNode } from "react";
import ProductCard from "@/components/merchandise/ProductCard";
import {
  formatQuantity,
  groupCardsByType,
  type CatalogProduct,
  type TypeSummary,
} from "@/lib/merchCatalog";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

interface TypeChipsProps {
  /** Product types to offer, in display order; chips for types with no products are left out. */
  types: readonly TypeSummary[];
  /** The chosen type, or the "no filter" value. */
  active: string;
  /** Called with a type, or with `allValue` when the active chip is pressed again. */
  onSelect: (type: string) => void;
  allValue: string;
  /** "scroll" keeps one row that scrolls sideways (a hub section); "wrap" lets the chips wrap. */
  layout?: "wrap" | "scroll";
  /** Distinguishes the group's label when more than one row is on the page. */
  category?: string;
  /** Hover or focus on a chip: the whole category is about to be needed. */
  onIntent?: () => void;
}

/**
 * "Shop by type": one chip per product type with its count. A chip filters the
 * list to that type (aria-pressed); pressing the active chip again removes the
 * filter. The row scrolls sideways or wraps, and nothing in it traps focus:
 * the chips are ordinary buttons in the page's tab order, 44px tall.
 */
export function TypeChips({
  types,
  active,
  onSelect,
  allValue,
  layout = "wrap",
  category,
  onIntent,
}: TypeChipsProps) {
  const shown = types.filter((type) => type.count > 0 || type.label === active);
  if (shown.length < 2 && active === allValue) return null;
  return (
    <div
      role="group"
      aria-label={category ? `Shop ${category} by type` : "Shop by type"}
      className="mt-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
    >
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-onyx/70">
        Shop by type
      </span>
      <ul
        className={
          layout === "scroll"
            ? "-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:thin]"
            : "flex flex-wrap gap-2"
        }
      >
        {shown.map((type) => {
          const pressed = type.label === active;
          return (
            <li key={type.label} className="shrink-0">
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => onSelect(pressed ? allValue : type.label)}
                onPointerEnter={onIntent}
                onFocus={onIntent}
                className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${focusRing} ${
                  pressed
                    ? "border-onyx bg-onyx text-white"
                    : "border-gold/40 bg-cream text-onyx/80 hover:border-gold hover:text-onyx"
                }`}
              >
                {type.label}
                <span
                  className={`text-xs tabular-nums ${pressed ? "text-white/80" : "text-onyx/70"}`}
                >
                  {formatQuantity(type.count)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Grid classes shared by every card grid on the storefront. */
export const CARD_GRID_CLASSES =
  "grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4";

interface TypeSectionsProps {
  /** The cards to show, in type and brand-block order. */
  items: readonly CatalogProduct[];
  category: string;
  /** Full counts when only the first cards of the category are here. */
  known?: { types?: readonly TypeSummary[]; blockTotals?: Readonly<Record<string, number>> };
  /** Heading level of a type's sub-heading; brand blocks sit one level below, cards one below those. */
  typeLevel: 2 | 3;
  /** The first this many cards load eagerly (the first visible row). */
  priorityCards?: number;
  /** Prefix for heading ids, unique per section on the page. */
  idPrefix: string;
}

function heading(level: number, props: { id: string; className: string }, children: ReactNode) {
  return createElement(`h${level}`, props, children);
}

/**
 * The cards of one category as organised sections: a sub-heading per product
 * type ("Polos (14)") and, inside a type that has more than one brand, a
 * smaller one per brand block ("Peter Millar (4)", "Essentials (7)"). A type
 * with a single brand block shows no brand heading. Card titles sit one
 * heading level below whichever heading they are under.
 */
export function TypeSections({
  items,
  category,
  known,
  typeLevel,
  priorityCards = 0,
  idPrefix,
}: TypeSectionsProps) {
  const groups = useMemo(() => groupCardsByType(items, category, known), [items, category, known]);
  let position = 0;
  return (
    <div>
      {groups.map((group, groupIndex) => {
        const id = `${idPrefix}-type-${groupIndex}`;
        return (
          <div
            key={group.type}
            role="group"
            aria-labelledby={id}
            className={groupIndex > 0 ? "mt-10" : ""}
          >
            {heading(
              typeLevel,
              {
                id,
                className:
                  "border-b border-gold/20 pb-2 font-heading text-base uppercase tracking-wide text-onyx",
              },
              <>
                {group.type}{" "}
                <span className="text-sm font-medium normal-case tracking-normal text-onyx/70">
                  ({formatQuantity(group.total)})
                </span>
              </>
            )}
            {group.blocks.map((block, blockIndex) => {
              const blockId = `${id}-brand-${blockIndex}`;
              return (
                <div key={block.brand} className="mt-5">
                  {group.showBrands &&
                    heading(
                      typeLevel + 1,
                      { id: blockId, className: "text-sm font-semibold text-onyx/80" },
                      <>
                        {block.brand}{" "}
                        <span className="font-medium text-onyx/70">
                          ({formatQuantity(block.total)})
                        </span>
                      </>
                    )}
                  <div className={`${group.showBrands ? "mt-3" : ""} ${CARD_GRID_CLASSES}`}>
                    {block.items.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        priority={position++ < priorityCards}
                        headingLevel={(typeLevel + (group.showBrands ? 2 : 1)) as 3 | 4 | 5}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
