"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/merchandise/CartContext";
import { useProductSelection } from "@/components/merchandise/ProductSelectionContext";
import { useQuantityDraft } from "@/hooks/useQuantityDraft";
import { cleanColorName } from "@/lib/colorSwatches";
import { lineTotal as priceLine, minimumOrderQuantity } from "@/lib/cartPricing";
import { trackAddToCart, trackViewItem } from "@/lib/merchAnalytics";
import { formatPrice, nextTier, tierForQuantity, type CatalogProduct } from "@/lib/merchCatalog";

export default function ProductDetailActions({ product }: { product: CatalogProduct }) {
  const { items, addItem } = useCart();
  const { selectedColor, requireColor } = useProductSelection();
  const minQuantity = minimumOrderQuantity(product);
  // The last whole quantity the box held; pricing follows it while the box is mid-edit.
  const [quantity, setQuantity] = useState(product.tiers[0].quantity);
  // Why the last add was refused (below the minimum, or nothing entered).
  const [quantityError, setQuantityError] = useState("");
  const quantityRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    trackViewItem(product);
  }, [product]);

  // Picking a different color starts a new add, so drop the old confirmation.
  useEffect(() => {
    setAdded(null);
  }, [selectedColor]);

  const field = useQuantityDraft({
    value: quantity,
    onCommit: (next) => {
      setQuantity(next);
      setQuantityError("");
      setAdded(null);
    },
  });

  // Volume pricing and the minimum count units already in the cart, so only
  // the shortfall has to be added here.
  const neededNow = Math.max(1, minQuantity - inCart);

  function refuse(message: string) {
    setQuantityError(message);
    setAdded(null);
    quantityRef.current?.focus();
  }

  function handleAddToCart() {
    if (field.parsed.kind !== "ok") {
      refuse(
        neededNow > 1
          ? `Enter a quantity of ${neededNow} or more.`
          : "Enter a quantity of at least 1."
      );
      return;
    }
    if (quantity + inCart < minQuantity) {
      refuse(
        inCart > 0
          ? `The minimum order is ${minQuantity} units across all colors, and you already have ${inCart} in your cart. Enter ${neededNow} or more.`
          : `The minimum order is ${minQuantity} units. Enter ${minQuantity} or more.`
      );
      return;
    }
    if (!requireColor()) return;
    setQuantityError("");
    addItem(product.id, quantity, selectedColor);
    trackAddToCart({ product, color: selectedColor, quantity, unitPrice: activeTier.price });
    setAdded({ color: selectedColor, quantity });
  }

  const singleTier = product.tiers.length === 1;
  const inlineMessage = quantityError || field.message;

  return (
    <div className="mt-8 rounded-lg border border-gold/25 bg-cream-100/60 p-5 sm:p-6">
      <h2 className="font-heading text-lg text-onyx">Add to your order</h2>

      <div className="mt-4 grid grid-cols-[auto_1fr] items-end gap-x-5 gap-y-1">
        <div>
          <label
            htmlFor="quantity"
            className="block text-xs font-semibold uppercase tracking-wide text-onyx/60"
          >
            Quantity
          </label>
          <input
            {...field.inputProps}
            ref={quantityRef}
            id="quantity"
            type="number"
            inputMode="numeric"
            min={neededNow}
            aria-invalid={Boolean(quantityError)}
            aria-describedby={
              [minQuantity > 1 ? "quantity-minimum" : "", inlineMessage ? field.messageId : ""]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className="mt-2 w-28 rounded-md border border-gold/25 bg-cream px-3 py-2.5 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
          />
          {minQuantity > 1 && (
            <p id="quantity-minimum" className="mt-1.5 text-xs font-medium text-onyx/80">
              Minimum order: {minQuantity} units
            </p>
          )}
        </div>
        <div className="pb-0.5 text-right">
          {selectedColor && (
            <p className="text-xs font-medium text-onyx/70" data-testid="selected-color">
              {cleanColorName(selectedColor)} x {quantity}
            </p>
          )}
          <p className="text-xs text-onyx/60">
            {singleTier
              ? `${formatPrice(activeTier.price)} / unit`
              : `${formatPrice(activeTier.price)} / unit at ${activeTier.quantity}+`}
          </p>
          <p className="font-heading text-2xl font-bold leading-tight text-onyx">
            {formatPrice(lineTotal)}
          </p>
        </div>
      </div>

      {inlineMessage && (
        <p
          id={field.messageId}
          role="alert"
          className="mt-3 text-sm font-semibold leading-5 text-red-700"
        >
          {inlineMessage}
        </p>
      )}

      <p className="mt-3 min-h-[1.25rem] text-xs leading-5 text-onyx/60">
        {upcomingTier
          ? `Order ${upcomingTier.quantity}+ units to lower the price to ${formatPrice(upcomingTier.price)} per unit.`
          : singleTier
            ? ""
            : "You are at our best price for this item."}
        {inCart > 0 && ` Includes the ${inCart} already in your cart.`}
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
                className="font-semibold text-gold-text hover:underline"
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
