"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLogo } from "@/components/merchandise/LogoContext";
import { getImprintArea } from "@/config/merchandiseConfig";
import type { MerchProduct } from "@/types";

interface ProductImageWithLogoProps {
  product: MerchProduct;
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
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const src = imageSrc ?? product.image;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A color swap can bring in a photo with a different aspect ratio — drop
  // the stale measurement so the overlay doesn't briefly sit in the wrong
  // spot before the new image's onLoad fires.
  useEffect(() => {
    setNaturalSize(null);
  }, [src]);

  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-onyx/40">
        Image Coming Soon
      </div>
    );
  }

  const area = getImprintArea(product);

  // object-contain letterboxes each photo differently depending on its own
  // aspect ratio, so a fixed % of the container lands in a different spot
  // on every product. Anchor to the actual rendered image rect instead, or
  // the logo looks randomly placed from item to item.
  let overlayStyle: CSSProperties = { top: `${area.top}%`, left: `${area.left}%`, width: `${area.width}%` };
  if (containerSize && naturalSize) {
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
        onLoad={(event) => {
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
