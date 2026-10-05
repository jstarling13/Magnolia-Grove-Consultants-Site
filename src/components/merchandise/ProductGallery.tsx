"use client";

import ColorSwatches, { colorCountLabel } from "@/components/merchandise/ColorSwatches";
import ProductImageWithLogo from "@/components/merchandise/ProductImageWithLogo";
import {
  COLOR_REQUIRED_MESSAGE,
  useProductSelection,
} from "@/components/merchandise/ProductSelectionContext";
import type { CatalogProduct } from "@/lib/merchCatalog";

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
  const missingPhoto = Boolean(selectedColor) && !autoSelected && !imageSrc;

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
            <h2 className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
              {colors.length === 1 ? "Color" : `Colors (${colors.length})`}
            </h2>
            {selectedColor && !autoSelected && (
              <button
                type="button"
                onClick={clearColor}
                className="text-xs font-semibold text-gold-dark hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                Clear selection
              </button>
            )}
          </div>

          <ColorSwatches
            className="mt-3"
            colors={colors}
            size="md"
            showLabel
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

          {/* Reserved line so the note appearing never shifts the page. */}
          <p className="mt-2 min-h-[1.25rem] text-xs leading-5 text-onyx/50" aria-live="polite">
            {missingPhoto
              ? "Showing the standard product photo — ask us for this exact color."
              : null}
          </p>

          {colors.length > 8 && (
            <details className="mt-1 text-xs text-onyx/60">
              <summary className="cursor-pointer font-semibold text-onyx/70 hover:text-onyx">
                All {colorCountLabel(colors.length)}
              </summary>
              <ul className="mt-2 columns-2 gap-x-6 leading-6 sm:columns-3">
                {colors.map((color) => (
                  <li key={color} className="break-inside-avoid">
                    {color}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
