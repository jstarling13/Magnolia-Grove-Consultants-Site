"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCartProduct } from "@/lib/cartCatalogClient";
import type { CartProduct } from "@/lib/merchCatalog";

export type CartProductsStatus = "loading" | "ready" | "error";

interface Result {
  status: CartProductsStatus;
  /** Products loaded so far, by id. */
  products: ReadonlyMap<string, CartProduct>;
  /** Ids the server says no longer exist; the caller removes their lines. */
  missingIds: readonly string[];
  retry: () => void;
}

/**
 * Loads the products for the given ids, one small request each, in parallel.
 * Products already loaded are not fetched again. With `preloaded` products the
 * hook does no fetching at all (used when the caller already has the data).
 * Offline or server errors leave the status at "error" with nothing deleted;
 * `retry` tries the failed ones again.
 */
export function useCartProducts(
  productIds: readonly string[],
  preloaded?: readonly CartProduct[]
): Result {
  const [loaded, setLoaded] = useState<ReadonlyMap<string, CartProduct>>(new Map());
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const [attempt, setAttempt] = useState(0);

  const preloadedById = useMemo(
    () => (preloaded ? new Map(preloaded.map((product) => [product.id, product])) : undefined),
    [preloaded]
  );
  const idKey = productIds.join("\n");

  useEffect(() => {
    if (preloadedById) return;
    const wanted = idKey ? idKey.split("\n") : [];
    const todo = wanted.filter((id) => !loaded.has(id) && !missing.has(id));
    if (todo.length === 0) return;
    let cancelled = false;
    Promise.all(
      todo.map((id) =>
        fetchCartProduct(id).then(
          (result) => ({ id, result }),
          () => ({ id, result: undefined })
        )
      )
    ).then((outcomes) => {
      if (cancelled) return;
      const nextLoaded = new Map<string, CartProduct>();
      const nextMissing: string[] = [];
      const nextFailed = new Set<string>();
      for (const { id, result } of outcomes) {
        if (!result) nextFailed.add(id);
        else if (result.kind === "ok") nextLoaded.set(id, result.product);
        else nextMissing.push(id);
      }
      if (nextLoaded.size > 0) setLoaded((prev) => new Map([...prev, ...nextLoaded]));
      if (nextMissing.length > 0) setMissing((prev) => new Set([...prev, ...nextMissing]));
      setFailed(nextFailed);
    });
    return () => {
      cancelled = true;
    };
    // `loaded`/`missing` only grow with results of this same effect; re-running on them would refetch nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, attempt, preloadedById]);

  const retry = useCallback(() => {
    setFailed(new Set());
    setAttempt((n) => n + 1);
  }, []);

  if (preloadedById) {
    return { status: "ready", products: preloadedById, missingIds: [], retry };
  }

  const wanted = idKey ? idKey.split("\n") : [];
  const unresolved = wanted.filter((id) => !loaded.has(id) && !missing.has(id));
  const status: CartProductsStatus =
    unresolved.length === 0
      ? "ready"
      : unresolved.some((id) => failed.has(id))
        ? "error"
        : "loading";
  return { status, products: loaded, missingIds: wanted.filter((id) => missing.has(id)), retry };
}
