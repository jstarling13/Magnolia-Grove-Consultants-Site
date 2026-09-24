import type { Metadata } from "next";
import CartPageContent from "@/components/merchandise/CartPageContent";

export const metadata: Metadata = {
  title: "Your Cart | Magnolia Grove Consultants",
  description: "Review your merchandise selections and submit your order request.",
};

export default function CartPage() {
  return <CartPageContent />;
}
