"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/merchandise/CartContext";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * A polite live region that tells screen reader users when the cart changes
 * (the add-to-cart button, the cart page and the pruner all change it, and
 * none of them is a control the shopper is still focused on afterwards).
 *
 * It stays silent while the saved cart loads, and on the cart page it speaks
 * only when a line is removed: every keystroke in a quantity box changes the
 * unit count, and the cart page already shows its own totals.
 */
export default function CartAnnouncer() {
  const { itemCount, lineCount, hydrated } = useCart();
  const pathname = usePathname();
  const onCartPage = pathname === "/merchandise/cart";
  const previous = useRef<{ units: number; lines: number } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    const before = previous.current;
    previous.current = { units: itemCount, lines: lineCount };
    if (!before) return;

    const summary = `Your cart has ${plural(lineCount, "item")}, ${plural(itemCount, "unit")}.`;
    if (lineCount < before.lines) {
      setMessage(
        lineCount === 0 ? "Removed from cart. Your cart is empty." : `Removed from cart. ${summary}`
      );
    } else if (!onCartPage && itemCount > before.units) {
      setMessage(`Added to cart. ${summary}`);
    }
  }, [hydrated, itemCount, lineCount, onCartPage]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
