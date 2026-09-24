"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/merchandise/CartContext";
import { tierForQuantity } from "@/config/merchandiseConfig";
import type { MerchProduct } from "@/types";

export default function ProductDetailActions({ product }: { product: MerchProduct }) {
  const { addItem } = useCart();
  const minQuantity = Math.min(...product.priceTiers.map((tier) => tier.quantity));
  const [quantity, setQuantity] = useState(minQuantity);
  const [added, setAdded] = useState(false);

  const activeTier = useMemo(() => tierForQuantity(product, quantity), [product, quantity]);
  const lineTotal = activeTier.price * quantity;

  function handleQuantityChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    setQuantity(Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
    setAdded(false);
  }

  function handleAddToCart() {
    addItem(product.id, quantity);
    setAdded(true);
  }

  return (
    <div className="mt-8 rounded-lg border border-gold/25 bg-cream-100/60 p-6">
      <label htmlFor="quantity" className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
        Quantity
      </label>
      <div className="mt-2 flex items-center gap-4">
        <input
          id="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => handleQuantityChange(event.target.value)}
          className="w-28 rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
        />
        <div className="text-sm text-onyx/70">
          <span className="font-heading text-xl font-bold text-onyx">
            ${lineTotal.toFixed(2)}
          </span>{" "}
          (${activeTier.price.toFixed(2)}/unit at {activeTier.quantity}+ tier)
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-gold px-6 py-3 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright sm:w-auto"
      >
        Add to Cart
      </button>

      {added && (
        <p className="mt-4 text-sm text-onyx/70">
          Added to cart.{" "}
          <Link href="/merchandise/cart" className="font-semibold text-gold-dark hover:underline">
            View cart →
          </Link>
        </p>
      )}
    </div>
  );
}
