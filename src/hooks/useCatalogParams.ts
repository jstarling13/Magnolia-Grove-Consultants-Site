"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_PARAMS,
  applyCatalogParams,
  parseCatalogParams,
  sameParams,
  type CatalogParams,
  type ParseContext,
} from "@/lib/merchFilters";

const SEARCH_DEBOUNCE_MS = 200;

export type HistoryMode = "push" | "replace";

/**
 * The shopper's search, sort and filters, kept in the URL's query string.
 *
 * Server and first client render use the defaults, so the markup matches; the
 * URL is read in an effect right after hydration. Choosing a filter, sort or
 * category adds a history entry (the back button undoes it, and the popstate
 * listener restores the earlier view); typing in the search box only replaces
 * the current entry, once typing pauses. Nothing here touches the network.
 */
export function useCatalogParams(context: ParseContext) {
  const [params, setParams] = useState<CatalogParams>(DEFAULT_PARAMS);
  const [queryInput, setQueryInput] = useState("");
  const paramsRef = useRef(params);
  const contextRef = useRef(context);
  contextRef.current = context;
  const timer = useRef<number | undefined>(undefined);

  const cancelPending = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  /** Shows `next` (already read from the URL, so nothing is written back). */
  const adopt = useCallback(
    (next: CatalogParams) => {
      cancelPending();
      if (sameParams(next, paramsRef.current)) {
        setQueryInput((prev) => (prev.trim() === next.query ? prev : next.query));
        return;
      }
      paramsRef.current = next;
      setParams(next);
      setQueryInput(next.query);
    },
    [cancelPending]
  );

  useEffect(() => {
    adopt(parseCatalogParams(window.location.search, contextRef.current));
    const onPopState = () => adopt(parseCatalogParams(window.location.search, contextRef.current));
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      cancelPending();
    };
  }, [adopt, cancelPending]);

  const update = useCallback(
    (patch: Partial<CatalogParams>, mode: HistoryMode = "push") => {
      const next = { ...paramsRef.current, ...patch };
      if (patch.query !== undefined) {
        // A search set from outside (a chip, Clear all) replaces whatever is typed.
        cancelPending();
        setQueryInput(patch.query);
      }
      if (sameParams(next, paramsRef.current)) return;
      paramsRef.current = next;
      setParams(next);
      const url = new URL(window.location.href);
      url.search = applyCatalogParams(url.search, next);
      if (url.href !== window.location.href) {
        const write = mode === "push" ? window.history.pushState : window.history.replaceState;
        write.call(window.history, window.history.state, "", url);
      }
    },
    [cancelPending]
  );

  /** Typing in the search box: the box updates now, the URL and results once typing pauses. */
  const onQueryInput = useCallback(
    (value: string) => {
      setQueryInput(value);
      cancelPending();
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        update({ query: value.trim() }, "replace");
      }, SEARCH_DEBOUNCE_MS);
    },
    [cancelPending, update]
  );

  return { params, queryInput, onQueryInput, update };
}
