"use client";

import { useEffect, useState } from "react";
import ColorSwatches, { colorCountLabel } from "@/components/merchandise/ColorSwatches";
import ProductImageWithLogo from "@/components/merchandise/ProductImageWithLogo";
import type { CatalogProduct } from "@/lib/merchCatalog";

export default function ProductGallery({ product }: { product: CatalogProduct }) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const colors = product.colors ?? [];
  const imageSrc = selectedColor ? product.colorImages?.[selectedColor] : undefined;
  const missingPhoto = Boolean(selectedColor) && !imageSrc;

  // Cards link here with ?color=<name> so the color a shopper picked carries
  // over. Read after mount (not during render) to keep hydration clean.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("color");
    if (requested && colors.includes(requested)) setSelectedColor(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

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
            {selectedColor && (
              <button
                type="button"
                onClick={() => setSelectedColor(undefined)}
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
            onSelect={(color) => setSelectedColor((prev) => (prev === color ? undefined : color))}
          />

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
