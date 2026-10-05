"use client";

import Link from "next/link";
import { useCart } from "@/components/merchandise/CartContext";

export default function CartLink() {
  // Lines, not units: a 5,000-unit minimum would otherwise read "Cart (5000)".
  const { lineCount } = useCart();

  return (
    <Link
      href="/merchandise/cart"
      className="inline-flex items-center gap-2 rounded-md border border-gold/40 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-gold hover:text-gold-bright"
    >
      Cart{lineCount > 0 ? ` (${lineCount})` : ""}
    </Link>
  );
}
