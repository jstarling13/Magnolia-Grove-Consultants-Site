"use client";

import { useId, useState, type Ref } from "react";
import Link from "next/link";
import { cleanColorName, swatchBackground, swatchInfo } from "@/lib/colorSwatches";

interface ColorSwatchesProps {
  colors: string[];
  /** Swatches shown before the rest collapse behind "+N more". Default: all. */
  max?: number;
  size?: "sm" | "md";
  /** Currently selected color (exact string from `colors`). */
  selected?: string;
  /** When omitted the swatches are static, non-interactive dots. */
  onSelect?: (color: string) => void;
  /**
   * Where "+N more" leads. When set it renders as a link (cards send people
   * to the detail page); when omitted it expands in place.
   */
  moreHref?: string;
  /** Name the expand button "Show all N colors" instead of "+N more". */
  showAllLabel?: boolean;
  /** Show the selected color's name (or the color count) above the swatches. */
  showLabel?: boolean;
  /**
   * With `showLabel`, leave the color count out when nothing is selected, for
   * pages that already print the count in a heading. The line stays in place
   * (empty) so picking a color never shifts the layout.
   */
  hideCount?: boolean;
  /** Ref to the swatch group, so a parent can move focus to it (e.g. after a validation error). */
  groupRef?: Ref<HTMLDivElement>;
  /** id of an element describing the group (an inline error, for instance). */
  describedBy?: string;
  className?: string;
}

const DOT_SIZE = { sm: "h-5 w-5", md: "h-7 w-7" } as const;
/**
 * Padding around the dot. Cards (sm) stay compact at 24px, above the 24px
 * WCAG 2.2 minimum. Product-page swatches (md) are 28px dots in 8px of
 * padding, so each button is 44x44 CSS px, the recommended touch size.
 */
const BUTTON_PADDING = { sm: "p-0.5", md: "p-2" } as const;

export function ColorDot({
  color,
  size = "sm",
  className = "",
}: {
  color: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const info = swatchInfo(color);
  return (
    <span
      aria-hidden="true"
      className={`${DOT_SIZE[size]} block shrink-0 rounded-full border ${
        info.kind === "unknown" ? "border-dashed border-onyx/40" : "border-onyx/20"
      } ${className}`}
      style={{ background: swatchBackground(info) }}
    />
  );
}

export function colorCountLabel(count: number): string {
  return `${count} ${count === 1 ? "color" : "colors"}`;
}

export default function ColorSwatches({
  colors,
  max,
  size = "sm",
  selected,
  onSelect,
  moreHref,
  showLabel = false,
  hideCount = false,
  showAllLabel = false,
  groupRef,
  describedBy,
  className = "",
}: ColorSwatchesProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  if (colors.length === 0) return null;

  const limit = max ?? colors.length;
  const collapsible = !moreHref && colors.length > limit;
  let visible = expanded || colors.length <= limit ? colors : colors.slice(0, limit);
  // A collapsed list never hides the selected color (it may have come from a
  // link or the keyboard): it follows the visible swatches.
  if (selected && colors.includes(selected) && !visible.includes(selected)) {
    visible = [...visible, selected];
  }
  const hiddenCount = colors.length - visible.length;
  const interactive = Boolean(onSelect);

  return (
    <div className={className}>
      {showLabel && (
        <p
          className={`mb-1.5 truncate text-xs font-medium text-onyx/60 ${hideCount ? "min-h-4" : ""}`}
          aria-live="polite"
        >
          {selected ? (
            <>
              <span>Color: </span>
              <span className="text-onyx">{cleanColorName(selected)}</span>
            </>
          ) : hideCount ? null : (
            colorCountLabel(colors.length)
          )}
        </p>
      )}
      <div
        id={listId}
        ref={groupRef}
        role="group"
        aria-label="Available colors"
        aria-describedby={describedBy}
        tabIndex={groupRef ? -1 : undefined}
        className={`flex w-fit max-w-full flex-wrap items-center rounded-md focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-gold-dark ${
          size === "sm" ? "gap-0.5" : "gap-0"
        }`}
      >
        {visible.map((color) => {
          const isSelected = selected === color;
          if (!interactive) {
            return (
              <span key={color} title={color} className="p-0.5">
                <ColorDot color={color} size={size} />
              </span>
            );
          }
          // Cards ring the whole (compact) button. On md the button is a 44px
          // touch target around a 28px dot, so the ring belongs on the dot.
          const ringOnDot = size === "md";
          const ring = isSelected
            ? "ring-2 ring-onyx ring-offset-1 ring-offset-cream-100"
            : "hover:ring-1 hover:ring-onyx/40";
          return (
            <button
              key={color}
              type="button"
              title={color}
              aria-label={`Select color ${color}`}
              aria-pressed={isSelected}
              onClick={() => onSelect?.(color)}
              className={`group rounded-full ${BUTTON_PADDING[size]} transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                ringOnDot ? "" : ring
              }`}
            >
              <ColorDot
                color={color}
                size={size}
                className={
                  ringOnDot
                    ? isSelected
                      ? ring
                      : "group-hover:ring-1 group-hover:ring-onyx/40"
                    : ""
                }
              />
            </button>
          );
        })}

        {hiddenCount > 0 && moreHref && (
          <Link
            href={moreHref}
            prefetch={false}
            className="ml-1 whitespace-nowrap rounded text-xs font-semibold text-gold-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            +{hiddenCount} more
          </Link>
        )}
        {collapsible && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((value) => !value)}
            className={`ml-1 whitespace-nowrap rounded text-xs font-semibold text-gold-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
              size === "md" ? "min-h-[44px] px-2" : ""
            }`}
          >
            {expanded
              ? "Show fewer"
              : showAllLabel
                ? `Show all ${colorCountLabel(colors.length)}`
                : `+${hiddenCount} more`}
          </button>
        )}
      </div>
    </div>
  );
}
