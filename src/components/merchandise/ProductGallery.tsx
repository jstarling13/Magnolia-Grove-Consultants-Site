"use client";

import ColorSwatches from "@/components/merchandise/ColorSwatches";
import ProductImageWithLogo from "@/components/merchandise/ProductImageWithLogo";
import {
  COLOR_REQUIRED_MESSAGE,
  useProductSelection,
} from "@/components/merchandise/ProductSelectionContext";
import type { CatalogProduct } from "@/lib/merchCatalog";

/** Shown when the picked color has no photo of its own (the main photo is one sample color). */
export const MISSING_PHOTO_NOTE =
  "This color doesn't have its own photo yet. The photo shows our standard sample - ask us for the exact color.";

/** Swatches shown before "Show all N colors" (two full rows on a 375px phone). */
const VISIBLE_SWATCHES = 14;
/** Lists this long or shorter just show everything; hiding a few isn't worth a toggle. */
const COLLAPSE_THRESHOLD = 18;

export default function ProductGallery({ product }: { product: CatalogProduct }) {
  const {
    colors,
    selectedColor,
    autoSelected,
    selectColor,
    clearColor,
    colorError,
    swatchGroupRef,
  } = useProductSelection();
  const imageSrc = selectedColor ? product.colorImages?.[selectedColor] : undefined;
  // Only explain a missing photo when the shopper picked the color themselves.
  const missingPhoto =
    Boolean(selectedColor) && !autoSelected && !imageSrc && !product.allColorsInPhoto;
  // Long color lists show the first rows and tuck the rest behind one toggle,
  // so 60 touch-sized swatches don't push the price and cart button off screen.
  const collapseAfter = colors.length > COLLAPSE_THRESHOLD ? VISIBLE_SWATCHES : undefined;

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gold/25 bg-cream-100">
        <ProductImageWithLogo
          product={product}
          imageSrc={imageSrc}
          imageAlt={selectedColor ? `${product.name} in ${selectedColor}` : undefined}
          sizes="(min-width: 1152px) 560px, (min-width: 1024px) 45vw, 100vw"
          priority
        />
      </div>

      {colors.length > 0 && (
        <div id="colors" className="mt-6 scroll-mt-28">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-onyx/60">
              {colors.length === 1 ? "Color" : `Colors (${colors.length})`}
            </h2>
            {selectedColor && !autoSelected && (
              <button
                type="button"
                onClick={clearColor}
                className="text-xs font-semibold text-gold-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                Clear selection
              </button>
            )}
          </div>

          <ColorSwatches
            className="mt-1"
            colors={colors}
            max={collapseAfter}
            size="md"
            showLabel
            hideCount
            showAllLabel
            selected={selectedColor}
            onSelect={selectColor}
            groupRef={swatchGroupRef}
            describedBy={colorError ? "color-error" : undefined}
          />

          {colorError && (
            <p id="color-error" role="alert" className="mt-2 text-sm font-semibold text-red-600">
              {COLOR_REQUIRED_MESSAGE}
            </p>
          )}

          {/* Reserves one line; the longer note may wrap, but only after the shopper picks a color. */}
          <p className="mt-2 min-h-[1.25rem] text-xs leading-5 text-onyx/60" aria-live="polite">
            {missingPhoto ? MISSING_PHOTO_NOTE : null}
          </p>
        </div>
      )}
    </div>
  );
}
