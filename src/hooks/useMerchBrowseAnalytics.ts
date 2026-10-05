"use client";

import { useEffect, useRef } from "react";
import {
  scheduleSearchEvent,
  setActiveList,
  trackViewItemList,
  type ListableProduct,
} from "@/lib/merchAnalytics";

/** Wait for the list name to stop changing (e.g. while the URL's ?category= is applied). */
const LIST_SETTLE_MS = 400;

/**
 * GA4 browse events for a product listing: `view_item_list` when the list
 * (category) settles, and a debounced `search` when the shopper searches.
 * `getProducts` is read only when the event fires, so callers can pass an
 * inline function without it costing a render.
 */
export function useMerchBrowseAnalytics(
  listName: string,
  getProducts: () => readonly ListableProduct[],
  query: string
): void {
  const getProductsRef = useRef(getProducts);
  useEffect(() => {
    getProductsRef.current = getProducts;
  });

  useEffect(() => {
    setActiveList(listName);
    const timer = window.setTimeout(
      () => trackViewItemList(listName, getProductsRef.current()),
      LIST_SETTLE_MS
    );
    return () => {
      window.clearTimeout(timer);
      setActiveList(undefined);
    };
  }, [listName]);

  useEffect(() => {
    if (query) scheduleSearchEvent(query);
  }, [query]);
}
