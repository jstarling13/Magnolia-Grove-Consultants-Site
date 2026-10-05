import { NextResponse } from "next/server";
import { products } from "@/config/merchandiseConfig";
import { getCartProduct } from "@/lib/merchStorefront";

// Static at build time, one small file per product. The cart page ships no
// catalog; it fetches this file for each product a shopper actually has in
// their cart, so cart page weight does not grow with the catalog. A 404 means
// the product no longer exists (or is hidden) and the cart drops its lines.
// Customer-facing fields only, from the allow-list in toCartProduct.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getCartProduct(id);
  if (!product) return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  return NextResponse.json(product, {
    headers: {
      // A data file, not a page: keep it out of search results.
      "X-Robots-Tag": "noindex",
      // Short browser cache so a hidden or repriced product is noticed quickly;
      // the CDN holds it until the next deploy.
      "Cache-Control": "public, max-age=300, s-maxage=31536000",
    },
  });
}
