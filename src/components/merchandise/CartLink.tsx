"use client";

import Link from "next/link";
import { useCart } from "@/components/merchandise/CartContext";
import { FOCUS_RING_ON_DARK } from "@/components/global/focusRing";

export default function CartLink() {
  // Lines, not units: a 5,000-unit minimum would otherwise read "Cart (5000)".
  const { lineCount } = useCart();

  return (
    <Link
      href="/merchandise/cart"
      className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-gold/40 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-gold hover:text-gold-bright ${FOCUS_RING_ON_DARK}`}
    >
      Cart{lineCount > 0 ? ` (${lineCount})` : ""}
    </Link>
  );
}
