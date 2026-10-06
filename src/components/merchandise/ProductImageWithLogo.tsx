"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLogo } from "@/components/merchandise/LogoContext";
import type { CatalogProduct } from "@/lib/merchCatalog";

interface ProductImageWithLogoProps {
  product: Pick<CatalogProduct, "name" | "image" | "imageAlt" | "imprintArea">;
  sizes: string;
  priority?: boolean;
  /** Overrides product.image — used to swap in a color-specific photo. */
  imageSrc?: string;
  imageAlt?: string;
}

// Must match the p-5 class on the product <Image> below.
const IMAGE_PADDING_PX = 20;

// A logo with a tall aspect ratio would otherwise grow far past the item at
// a width chosen for a wide mark. The box is allowed to be this many times
// taller than the width the config asked for; object-contain fits the logo
// inside it, so wide logos are unaffected.
const MAX_LOGO_HEIGHT_RATIO = 1.25;

export const LOGO_PREVIEW_UNAVAILABLE_NOTE = "Logo preview not available for this photo";

export default function ProductImageWithLogo({
  product,
  sizes,
  priority,
  imageSrc,
  imageAlt,
}: ProductImageWithLogoProps) {
  const { logo } = useLogo();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const src = imageSrc ?? product.image;
  const hasLogo = Boolean(logo);
  // Photos flagged `hide` (lifestyle scenes, several items in one shot,
  // sample artwork already where a logo would go) get a note instead of an
  // overlay, so there is nothing to measure either.
  const previewHidden = Boolean(product.imprintArea.hide);
  const showOverlay = hasLogo && !previewHidden;

  // Measuring is only needed while a logo preview is showing, so with no
  // logo (the common case, up to hundreds of cards) or a hidden preview there
  // is no observer and no per-image state update. A color swap can bring in a photo with a
  // different aspect ratio, so the stale measurement is dropped whenever
  // `src` changes and re-read once the new image has loaded.
  useEffect(() => {
    setNaturalSize(null);
    if (!showOverlay) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    }
    return () => observer.disconnect();
  }, [src, showOverlay]);

  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-onyx/60">
        Image Coming Soon
      </div>
    );
  }

  const area = product.imprintArea;

  // object-contain letterboxes each photo differently depending on its own
  // aspect ratio, so a fixed % of the container lands in a different spot
  // on every product. Anchor to the actual rendered image rect instead, or
  // the logo looks randomly placed from item to item.
  let overlayStyle: CSSProperties = {
    top: `${area.top}%`,
    left: `${area.left}%`,
    width: `${area.width}%`,
  };
  if (showOverlay && containerSize && naturalSize) {
    const contentW = containerSize.width - IMAGE_PADDING_PX * 2;
    const contentH = containerSize.height - IMAGE_PADDING_PX * 2;
    const imageAspect = naturalSize.width / naturalSize.height;
    const contentAspect = contentW / contentH;

    let renderedW: number;
    let renderedH: number;
    let offsetX: number;
    let offsetY: number;

    if (imageAspect > contentAspect) {
      renderedW = contentW;
      renderedH = contentW / imageAspect;
      offsetX = IMAGE_PADDING_PX;
      offsetY = IMAGE_PADDING_PX + (contentH - renderedH) / 2;
    } else {
      renderedH = contentH;
      renderedW = contentH * imageAspect;
      offsetY = IMAGE_PADDING_PX;
      offsetX = IMAGE_PADDING_PX + (contentW - renderedW) / 2;
    }

    const logoWidthPx = (area.width / 100) * renderedW;
    overlayStyle = {
      top: `${offsetY + (area.top / 100) * renderedH}px`,
      left: `${offsetX + (area.left / 100) * renderedW}px`,
      width: `${logoWidthPx}px`,
      maxHeight: `${logoWidthPx * MAX_LOGO_HEIGHT_RATIO}px`,
    };
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <Image
        src={src}
        alt={imageAlt ?? product.imageAlt ?? product.name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain object-center p-5"
        ref={imgRef}
        onLoad={(event) => {
          if (!showOverlay) return;
          const img = event.currentTarget;
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        }}
      />
      {logo && previewHidden && (
        <p className="pointer-events-none absolute bottom-1.5 left-1.5 max-w-[calc(100%-0.75rem)] rounded bg-cream-100/90 px-1.5 text-[10px] leading-4 text-onyx/60">
          {LOGO_PREVIEW_UNAVAILABLE_NOTE}
        </p>
      )}
      {showOverlay && logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt="Your logo preview"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-sm"
          style={overlayStyle}
        />
      )}
    </div>
  );
}
