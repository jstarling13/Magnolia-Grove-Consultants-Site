"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/merchandise/CartContext";
import { formatPrice, nextTier, tierForQuantity, type CatalogProduct } from "@/lib/merchCatalog";

export default function ProductDetailActions({ product }: { product: CatalogProduct }) {
  const { addItem } = useCart();
  const minQuantity = product.tiers[0].quantity;
  const [quantity, setQuantity] = useState(minQuantity);
  const [added, setAdded] = useState(false);

  const activeTier = useMemo(() => tierForQuantity(product, quantity), [product, quantity]);
  const upcomingTier = useMemo(() => nextTier(product, quantity), [product, quantity]);
  const lineTotal = Math.round(activeTier.price * quantity * 100) / 100;

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
    <div className="mt-8 rounded-lg border border-gold/25 bg-cream-100/60 p-5 sm:p-6">
      <h2 className="font-heading text-lg text-onyx">Add to your order</h2>

      <div className="mt-4 grid grid-cols-[auto_1fr] items-end gap-x-5 gap-y-1">
        <div>
          <label
            htmlFor="quantity"
            className="block text-xs font-semibold uppercase tracking-wide text-onyx/50"
          >
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(event) => handleQuantityChange(event.target.value)}
            className="mt-2 w-28 rounded-md border border-gold/25 bg-cream px-3 py-2.5 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
          />
        </div>
        <div className="pb-0.5 text-right">
          <p className="text-xs text-onyx/50">
            {formatPrice(activeTier.price)} / unit at {activeTier.quantity}+
          </p>
          <p className="font-heading text-2xl font-bold leading-tight text-onyx">
            {formatPrice(lineTotal)}
          </p>
        </div>
      </div>

      <p className="mt-3 min-h-[1.25rem] text-xs leading-5 text-onyx/60">
        {upcomingTier
          ? `Order ${upcomingTier.quantity}+ units to lower the price to ${formatPrice(upcomingTier.price)} per unit.`
          : "You are at our best price for this item."}
      </p>

      <button
        type="button"
        onClick={handleAddToCart}
        className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-gold px-6 py-3.5 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
      >
        Add to Cart
      </button>

      <div role="status" className="mt-3 min-h-[1.25rem] text-sm text-onyx/70">
        {added && (
          <>
            Added to cart.{" "}
            <Link href="/merchandise/cart" className="font-semibold text-gold-dark hover:underline">
              View cart →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
