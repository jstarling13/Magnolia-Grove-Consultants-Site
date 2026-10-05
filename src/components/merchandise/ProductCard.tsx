"use client";

import { memo, useState } from "react";
import Link from "next/link";
import ColorSwatches from "@/components/merchandise/ColorSwatches";
import CardImage from "@/components/merchandise/CardImage";
import {
  bestTier,
  formatPrice,
  isRealBrand,
  startingTier,
  type CatalogProduct,
} from "@/lib/merchCatalog";

/** Swatches that fit on one row of a card; the rest link to the detail page. */
const CARD_SWATCH_LIMIT = 6;

// Rendered width of the card photo, from the catalog grid: page padding
// 24/32/48px a side, gaps 20/24px, 1/2/3/4 columns, content capped at 1440px.
const CARD_IMAGE_SIZES = [
  "(min-width: 1280px) calc((min(100vw - 96px, 1440px) - 72px) / 4)",
  "(min-width: 1024px) calc((100vw - 96px - 48px) / 3)",
  "(min-width: 640px) calc((100vw - 64px - 24px) / 2)",
  "calc(100vw - 48px)",
].join(", ");

// The compact "More in <category>" row: 2 columns, then 4 inside a 1152px cap.
const COMPACT_IMAGE_SIZES = [
  "(min-width: 1024px) calc((min(100vw - 96px, 1152px) - 60px) / 4)",
  "(min-width: 640px) calc((100vw - 64px - 20px) / 2)",
  "calc((100vw - 48px - 16px) / 2)",
].join(", ");

interface ProductCardProps {
  product: CatalogProduct;
  /** First visible row: load eagerly so it counts toward LCP. */
  priority?: boolean;
  /** Smaller card for rows such as "More in <category>": no blurb or swatches. */
  compact?: boolean;
}

function ProductCard({ product, priority = false, compact = false }: ProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  // Links in view are not prefetched (a page of cards would pull dozens of
  // product pages nobody opens); hovering or focusing one starts its prefetch.
  const [intent, setIntent] = useState(false);

  const first = startingTier(product);
  const best = bestTier(product);
  const hasRange = product.tiers.length > 1 && best.price < first.price;
  const imageSrc = selectedColor ? product.colorImages?.[selectedColor] : undefined;
  const colors = product.colors ?? [];
  const detailHref = `/merchandise/${product.id}`;
  const colorQuery = selectedColor ? `?color=${encodeURIComponent(selectedColor)}` : "";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-gold/25 bg-cream-100/85 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-gold/15 bg-cream-100 sm:aspect-square">
        <CardImage
          product={product}
          imageSrc={imageSrc}
          imageAlt={selectedColor ? `${product.name} in ${selectedColor}` : undefined}
          sizes={compact ? COMPACT_IMAGE_SIZES : CARD_IMAGE_SIZES}
          priority={priority}
        />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Reserved line so titles align whether or not the brand is shown. */}
        <p className="h-4 truncate text-[11px] font-semibold uppercase leading-4 tracking-wide text-gold-dark">
          {isRealBrand(product.brand) ? product.brand : null}
        </p>

        <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-onyx">
          <Link
            href={`${detailHref}${colorQuery}`}
            prefetch={intent ? null : false}
            onPointerEnter={() => setIntent(true)}
            onFocus={() => setIntent(true)}
            title={product.name}
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold-dark"
          >
            {product.name}
          </Link>
        </h3>

        {!compact && (
          <>
            <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-onyx/60">
              {product.description}
            </p>

            {/* Fixed-height slot: cards with no colors keep the same height. */}
            <div className="relative z-10 mt-3 min-h-[3.25rem]">
              {colors.length > 0 && (
                <ColorSwatches
                  colors={colors}
                  max={CARD_SWATCH_LIMIT}
                  size="sm"
                  showLabel
                  selected={selectedColor}
                  onSelect={(color) =>
                    setSelectedColor((prev) => (prev === color ? undefined : color))
                  }
                  moreHref={`${detailHref}#colors`}
                />
              )}
            </div>
          </>
        )}

        <div className={`${compact ? "mt-3" : "mt-auto"} border-t border-gold/15 pt-3`}>
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-onyx/50">
            {product.tiers.length > 1 && <span>From</span>}
            <span className="font-heading text-xl font-bold text-onyx">
              {formatPrice(first.price)}
            </span>
            <span>at {first.quantity}+ units</span>
          </p>
          <p className="mt-0.5 h-4 text-xs leading-4 text-onyx/50">
            {hasRange ? `As low as ${formatPrice(best.price)} at ${best.quantity}+ units` : null}
          </p>
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCard);
