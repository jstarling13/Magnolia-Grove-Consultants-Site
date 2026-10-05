"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/merchandise/CartContext";
import { useProductSelection } from "@/components/merchandise/ProductSelectionContext";
import { cleanColorName } from "@/lib/colorSwatches";
import { lineTotal as priceLine, minimumOrderQuantity } from "@/lib/cartPricing";
import { formatPrice, nextTier, tierForQuantity, type CatalogProduct } from "@/lib/merchCatalog";

export default function ProductDetailActions({ product }: { product: CatalogProduct }) {
  const { items, addItem } = useCart();
  const { selectedColor, requireColor } = useProductSelection();
  const minQuantity = minimumOrderQuantity(product);
  const [quantity, setQuantity] = useState(product.tiers[0].quantity);
  // What the last add put in the cart, for the confirmation line.
  const [added, setAdded] = useState<{ color?: string; quantity: number } | null>(null);

  // Volume pricing counts every color of this product already in the cart, so
  // the price shown here matches what the cart will charge after the add.
  const inCart = useMemo(
    () =>
      items
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + item.quantity, 0),
    [items, product.id]
  );
  const combined = quantity + inCart;
  const activeTier = useMemo(() => tierForQuantity(product, combined), [product, combined]);
  const upcomingTier = useMemo(() => nextTier(product, combined), [product, combined]);
  const lineTotal = priceLine(activeTier.price, quantity);

  // Picking a different color starts a new add, so drop the old confirmation.
  useEffect(() => {
    setAdded(null);
  }, [selectedColor]);

  function handleQuantityChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    setQuantity(Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
    setAdded(null);
  }

  function handleAddToCart() {
    if (!requireColor()) return;
    addItem(product.id, quantity, selectedColor);
    setAdded({ color: selectedColor, quantity });
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
          {selectedColor && (
            <p className="text-xs font-medium text-onyx/70" data-testid="selected-color">
              {cleanColorName(selectedColor)} x {quantity}
            </p>
          )}
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
        {inCart > 0 && ` Includes the ${inCart} already in your cart.`}
        {minQuantity > 1 && ` Minimum order is ${minQuantity} units.`}
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
            <p className="font-semibold text-onyx">
              {added.color
                ? `Added to cart: ${cleanColorName(added.color)} x ${added.quantity}`
                : `Added to cart: ${added.quantity} units`}
            </p>
            <p className="mt-1">
              <Link
                href="/merchandise/cart"
                className="font-semibold text-gold-dark hover:underline"
              >
                View cart →
              </Link>
              <span className="text-onyx/60">
                {" "}
                {product.colors && product.colors.length > 1
                  ? "or keep shopping. Pick another color to add it as its own line."
                  : "or keep shopping."}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
