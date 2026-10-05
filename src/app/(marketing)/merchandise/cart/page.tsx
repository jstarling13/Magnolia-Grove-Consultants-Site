import type { Metadata } from "next";
import CartPageContent from "@/components/merchandise/CartPageContent";
import { merchandisePage } from "@/config/merchandiseConfig";

export const metadata: Metadata = {
  title: "Your Cart | Magnolia Grove Consultants",
  description: "Review your merchandise selections and submit your order request.",
};

export default function CartPage() {
  // No catalog is shipped with the page: the cart fetches just the products in
  // the shopper's saved cart (see useCartProducts), so this page stays the same
  // size however large the catalog grows.
  return (
    <CartPageContent
      pricingDisclaimer={merchandisePage.pricingDisclaimer}
      deliveryEstimate={merchandisePage.deliveryEstimate}
    />
  );
}
