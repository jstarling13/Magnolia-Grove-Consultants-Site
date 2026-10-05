"use client";

import { useCallback, useRef, useState } from "react";
import { fetchCategoryCards } from "@/lib/merchCardsClient";
import type { CatalogProduct } from "@/lib/merchCatalog";

/**
 * Lazily loads the full card list of categories whose first cards were all
 * the server shipped. Asking twice for a category is free: requests in flight
 * or finished are remembered, and a failed one is forgotten so it can be
 * retried.
 */
export function useCategoryCards() {
  const [loaded, setLoaded] = useState<Record<string, CatalogProduct[]>>({});
  const [failed, setFailed] = useState<Record<string, true>>({});
  const requested = useRef(new Map<string, Promise<boolean>>());

  /** Resolves true once every category is loaded, false if any request failed. */
  const load = useCallback((categories: readonly string[]): Promise<boolean> => {
    const jobs = categories.map((category) => {
      const existing = requested.current.get(category);
      if (existing) return existing;
      const job = fetchCategoryCards(category).then(
        (cards) => {
          setLoaded((prev) => ({ ...prev, [category]: cards }));
          setFailed((prev) => {
            if (!prev[category]) return prev;
            const { [category]: _removed, ...rest } = prev;
            return rest;
          });
          return true;
        },
        () => {
          requested.current.delete(category);
          setFailed((prev) => ({ ...prev, [category]: true }));
          return false;
        }
      );
      requested.current.set(category, job);
      return job;
    });
    return Promise.all(jobs).then((results) => results.every(Boolean));
  }, []);

  return { loaded, failed, load };
}
