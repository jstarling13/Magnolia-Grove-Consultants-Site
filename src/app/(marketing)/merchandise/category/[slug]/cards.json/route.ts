import { NextResponse } from "next/server";
import { categorySlug } from "@/lib/merchSlug";
import { getCategoryCards, getStorefrontCategories } from "@/lib/merchStorefront";

// Static at build time, one file per category. The catalog and category pages
// ship only the first cards of a category and fetch the rest from here when
// the shopper presses Show more or uses search, sort or the brand filter, so
// page weight does not grow with the catalog.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getStorefrontCategories().map((category) => ({ slug: categorySlug(category) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = getCategoryCards(slug);
  if (!catalog) return NextResponse.json({ error: "Unknown category" }, { status: 404 });
  return NextResponse.json(catalog.cards, {
    headers: {
      // A data file, not a page: keep it out of search results.
      "X-Robots-Tag": "noindex",
      // The CDN holds it until the next deploy; browsers reuse it for a few
      // minutes, so a second visit or Show more does not refetch it.
      "Cache-Control": "public, max-age=300, s-maxage=31536000",
    },
  });
}
