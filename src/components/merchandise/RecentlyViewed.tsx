"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/merchCatalog";
import { RECENT_MAX, readRecent, recordRecentView } from "@/lib/merchRecent";

interface LookupEntry {
  id: string;
  name: string;
  image?: string;
  startingPrice: number;
}

const LOOKUP_URL = "/merchandise/lookup.json";

/** Card width: w-36 (144px) on phones, w-40 (160px) from the sm breakpoint. */
export const THUMBNAIL_SIZES = "(min-width: 640px) 160px, 144px";

let lookupPromise: Promise<Record<string, LookupEntry>> | undefined;

/** One shared fetch per page load; a failure is retried on the next mount. */
function loadLookup(): Promise<Record<string, LookupEntry>> {
  lookupPromise ??= fetch(LOOKUP_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Lookup failed: ${response.status}`);
      return response.json() as Promise<Record<string, LookupEntry>>;
    })
    .catch((error) => {
      lookupPromise = undefined;
      throw error;
    });
  return lookupPromise;
}

/** Test hook: forget the cached lookup. */
export function resetRecentLookupCache() {
  lookupPromise = undefined;
}

interface RecentlyViewedProps {
  /**
   * On a product page: that product's id. It is added to the history and left
   * out of the strip, so the strip only shows other items.
   */
  currentId?: string;
  /** Classes for the outer <section>, e.g. a full-width background band. */
  className?: string;
  /** Classes for an inner wrapper, e.g. a max-width container. */
  innerClassName?: string;
}

export default function RecentlyViewed({
  currentId,
  className = "",
  innerClassName = "",
}: RecentlyViewedProps) {
  const [items, setItems] = useState<LookupEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const ids = (currentId ? recordRecentView(currentId) : readRecent())
      .filter((id) => id !== currentId)
      .slice(0, RECENT_MAX);
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    loadLookup()
      .then((lookup) => {
        if (cancelled) return;
        // Ids for products that no longer exist are simply skipped.
        setItems(
          ids.map((id) => lookup[id]).filter((entry): entry is LookupEntry => Boolean(entry))
        );
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className={className}>
      <div className={innerClassName}>
        <h2
          id="recently-viewed-heading"
          className="border-b border-gold/20 pb-2 font-heading text-lg uppercase tracking-wide text-onyx/80"
        >
          Recently viewed
        </h2>
        <ul className="mt-6 flex gap-4 overflow-x-auto pb-3">
          {items.map((item) => (
            <li key={item.id} className="w-36 shrink-0 sm:w-40">
              <Link
                href={`/merchandise/${item.id}`}
                className="group block h-full overflow-hidden rounded-lg border border-gold/25 bg-cream-100/85 transition-colors hover:border-gold/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                <div className="relative aspect-square w-full border-b border-gold/15 bg-cream-100">
                  {/* Decorative on purpose: the product name sits in the same link, so
                      alt text here would make a screen reader read the name twice. */}
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes={THUMBNAIL_SIZES}
                      className="object-contain object-center p-3"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-onyx">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-onyx/60">
                    {formatPrice(item.startingPrice)} per unit
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
