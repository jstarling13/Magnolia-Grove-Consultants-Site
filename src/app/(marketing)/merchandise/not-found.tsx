import type { Metadata } from "next";
import Link from "next/link";
import { FOCUS_RING, FOCUS_RING_ON_DARK } from "@/components/global/focusRing";
import { categoryPath } from "@/lib/merchSlug";
import { getStorefrontCategories } from "@/lib/merchStorefront";

export const metadata: Metadata = {
  title: "Not Found | Magnolia Grove Consultants",
  robots: { index: false },
};

export default function MerchandiseNotFound() {
  const categories = getStorefrontCategories();

  return (
    <>
      <section className="bg-onyx px-6 py-20 text-center sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <span className="eyebrow">404 // Not Found</span>
          <h1 className="mt-3 text-4xl uppercase text-white sm:text-5xl">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-light">
            That product or category may have been renamed or removed from the catalog. Browse the
            full collection or pick a category below, or tell us what you need and we&apos;ll source
            it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/merchandise"
              className={`inline-flex min-h-11 items-center rounded-md bg-gold px-6 py-3 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright ${FOCUS_RING_ON_DARK}`}
            >
              Browse all merchandise
            </Link>
            <Link
              href="/merchandise#request"
              className={`inline-flex min-h-11 items-center rounded-md border border-gold/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-gold hover:text-gold-bright ${FOCUS_RING_ON_DARK}`}
            >
              Request a product
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-cream px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="border-b border-gold/20 pb-2 font-heading text-lg uppercase tracking-wide text-onyx/80">
            Shop by category
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {categories.map((name) => (
              <li key={name}>
                <Link
                  href={categoryPath(name)}
                  className={`inline-flex min-h-11 items-center rounded-full border border-gold-text/60 bg-cream px-4 py-1.5 text-sm font-medium text-onyx/80 transition-colors hover:border-gold-text hover:text-onyx ${FOCUS_RING}`}
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
