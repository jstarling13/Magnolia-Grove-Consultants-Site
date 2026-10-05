"use client";

import { Suspense, lazy } from "react";
import Image from "next/image";
import { useLogo } from "@/components/merchandise/LogoContext";
import type { CatalogProduct } from "@/lib/merchCatalog";

interface CardImageProps {
  product: Pick<CatalogProduct, "name" | "image" | "imageAlt" | "imprintArea">;
  sizes: string;
  priority?: boolean;
  /** Overrides product.image — used to swap in a color-specific photo. */
  imageSrc?: string;
  imageAlt?: string;
}

/**
 * The plain product photo, which is all a card needs until the shopper has
 * uploaded a logo. Mirrors ProductImageWithLogo's markup (same box, same
 * object-contain p-5 photo) so swapping to it causes no layout shift.
 */
function PlainCardImage({ product, sizes, priority, imageSrc, imageAlt }: CardImageProps) {
  const src = imageSrc ?? product.image;
  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-onyx/40">
        Image Coming Soon
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt={imageAlt ?? product.imageAlt ?? product.name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain object-center p-5"
      />
    </div>
  );
}

/**
 * The logo-preview machinery (measuring the photo, positioning the overlay) is
 * its own chunk, fetched only once a logo exists. Until it arrives the card
 * keeps showing the plain photo.
 */
const ProductImageWithLogo = lazy(() => import("@/components/merchandise/ProductImageWithLogo"));

export default function CardImage(props: CardImageProps) {
  const { logo } = useLogo();
  if (!logo) return <PlainCardImage {...props} />;
  return (
    <Suspense fallback={<PlainCardImage {...props} />}>
      <ProductImageWithLogo {...props} />
    </Suspense>
  );
}
