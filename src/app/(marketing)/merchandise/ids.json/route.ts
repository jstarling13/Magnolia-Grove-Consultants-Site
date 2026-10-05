import { NextResponse } from "next/server";
import { getAvailableProductIds } from "@/lib/merchStorefront";

// Static at build time: just the ids of products the storefront sells. A
// shopper's browser fetches it only when they have something in their cart, to
// drop saved lines for products that have since been removed or hidden. Ids
// only, so no prices or supplier data.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getAvailableProductIds(), {
    headers: {
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=300, s-maxage=31536000",
    },
  });
}
