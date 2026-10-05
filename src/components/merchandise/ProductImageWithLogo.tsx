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

  // Measuring is only needed while a logo preview is showing, so with no
  // logo (the common case, up to hundreds of cards) there is no observer and
  // no per-image state update. A color swap can bring in a photo with a
  // different aspect ratio, so the stale measurement is dropped whenever
  // `src` changes and re-read once the new image has loaded.
  useEffect(() => {
    setNaturalSize(null);
    if (!hasLogo) return;
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
  }, [src, hasLogo]);

  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-onyx/40">
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
  if (hasLogo && containerSize && naturalSize) {
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

    overlayStyle = {
      top: `${offsetY + (area.top / 100) * renderedH}px`,
      left: `${offsetX + (area.left / 100) * renderedW}px`,
      width: `${(area.width / 100) * renderedW}px`,
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
          if (!hasLogo) return;
          const img = event.currentTarget;
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        }}
      />
      {logo && (
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
