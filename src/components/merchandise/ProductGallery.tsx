"use client";

import { useState } from "react";
import ColorSwatches from "@/components/merchandise/ColorSwatches";
import ProductImageWithLogo from "@/components/merchandise/ProductImageWithLogo";
import type { MerchProduct } from "@/types";

export default function ProductGallery({ product }: { product: MerchProduct }) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const imageSrc = selectedColor ? product.colorImages?.[selectedColor] : undefined;

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gold/25 bg-cream-100">
        <ProductImageWithLogo
          product={product}
          imageSrc={imageSrc}
          imageAlt={selectedColor ? `${product.name} in ${selectedColor}` : undefined}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
      </div>

      {product.colors && product.colors.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
            {selectedColor ?? (product.colors.length === 1 ? "Color" : `Colors (${product.colors.length})`)}
          </h2>
          <div className="mt-2">
            <ColorSwatches
              colors={product.colors}
              max={product.colors.length}
              size="md"
              selected={selectedColor}
              onSelect={(color) => setSelectedColor((prev) => (prev === color ? undefined : color))}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-onyx/50">{product.colors.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
