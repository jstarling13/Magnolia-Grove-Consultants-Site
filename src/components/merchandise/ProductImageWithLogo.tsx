"use client";

import Image from "next/image";
import { useLogo } from "@/components/merchandise/LogoContext";
import { getImprintArea } from "@/config/merchandiseConfig";
import type { MerchProduct } from "@/types";

interface ProductImageWithLogoProps {
  product: MerchProduct;
  sizes: string;
  priority?: boolean;
}

export default function ProductImageWithLogo({ product, sizes, priority }: ProductImageWithLogoProps) {
  const { logo } = useLogo();

  if (!product.image) {
    return (
      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-onyx/40">
        Image Coming Soon
      </div>
    );
  }

  const area = getImprintArea(product);

  return (
    <>
      <Image
        src={product.image}
        alt={product.imageAlt ?? product.name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover object-center"
      />
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt="Your logo preview"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-sm"
          style={{
            top: `${area.top}%`,
            left: `${area.left}%`,
            width: `${area.width}%`,
          }}
        />
      )}
    </>
  );
}
