"use client";

import { memo, useState } from "react";
import Link from "next/link";
import ColorSwatches from "@/components/merchandise/ColorSwatches";
import ProductImageWithLogo from "@/components/merchandise/ProductImageWithLogo";
import { trackSelectItem } from "@/lib/merchAnalytics";
import {
  bestTier,
  formatPrice,
  isRealBrand,
  startingTier,
  type CatalogProduct,
} from "@/lib/merchCatalog";

/** Swatches that fit on one row of a card; the rest link to the detail page. */
const CARD_SWATCH_LIMIT = 6;

const CARD_IMAGE_SIZES =
  "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

interface ProductCardProps {
  product: CatalogProduct;
  /** First visible row: load eagerly so it counts toward LCP. */
  priority?: boolean;
  /** Smaller card for rows such as "More in <category>": no blurb or swatches. */
  compact?: boolean;
}

function ProductCard({ product, priority = false, compact = false }: ProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);

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
        <ProductImageWithLogo
          product={product}
          imageSrc={imageSrc}
          imageAlt={selectedColor ? `${product.name} in ${selectedColor}` : undefined}
          sizes={CARD_IMAGE_SIZES}
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
            title={product.name}
            onClick={() => trackSelectItem(product, { color: selectedColor, related: compact })}
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
