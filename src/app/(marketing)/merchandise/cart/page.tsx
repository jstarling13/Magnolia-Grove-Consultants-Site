import type { Metadata } from "next";
import CartPageContent from "@/components/merchandise/CartPageContent";
import { merchandisePage } from "@/config/merchandiseConfig";

const TITLE = "Your Cart | Magnolia Grove Consultants";
const DESCRIPTION = "Review your merchandise selections and submit your order request.";

// A personal, transactional page: kept out of search results. (robots.txt also
// disallows it; the meta tag covers crawlers that reach it anyway.)
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/merchandise/cart" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
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
