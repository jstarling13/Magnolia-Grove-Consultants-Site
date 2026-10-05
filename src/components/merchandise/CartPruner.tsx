"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/merchandise/CartContext";
import { fetchAvailableProductIds } from "@/lib/cartCatalogClient";

/**
 * Renders nothing. When the shopper has saved cart lines, asks once per visit
 * which products are still on sale and drops lines for the rest, so the header
 * count never includes a product that is gone. Shoppers with an empty cart
 * download nothing; the cart page itself finds gone products from its own
 * per-product requests, so it skips this.
 */
export default function CartPruner() {
  const { items, hydrated, removeProducts } = useCart();
  const pathname = usePathname();
  const asked = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const onCartPage = pathname === "/merchandise/cart";
  const hasItems = items.length > 0;

  useEffect(() => {
    if (!hydrated || !hasItems || onCartPage || asked.current) return;
    asked.current = true;
    fetchAvailableProductIds().then(
      (ids) => {
        const available = new Set(ids);
        const gone = itemsRef.current
          .map((item) => item.productId)
          .filter((id) => !available.has(id));
        removeProducts(gone);
      },
      () => {
        // Offline or a bad response: keep the saved lines; the cart page checks them itself.
      }
    );
  }, [hydrated, hasItems, onCartPage, removeProducts]);

  return null;
}
