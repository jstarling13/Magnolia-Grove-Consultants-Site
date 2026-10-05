/**
 * "Recently viewed" history for the storefront: product ids kept in
 * localStorage, newest first. Storage is user-editable and can be missing or
 * blocked (private windows, quota, SSR), so every read and write is
 * defensive and a bad value is treated as an empty history.
 */

export const RECENT_STORAGE_KEY = "mg-merch-recent";
export const RECENT_MAX = 8;

const VALID_ID = /^[A-Za-z0-9][\w.-]{0,199}$/;

/** Parses a stored value into a clean id list (valid ids, unique, capped). */
export function parseRecent(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  for (const entry of parsed) {
    if (typeof entry !== "string" || !VALID_ID.test(entry) || seen.has(entry)) continue;
    seen.add(entry);
    if (seen.size === RECENT_MAX) break;
  }
  return Array.from(seen);
}

/** New history with `id` moved to the front; never mutates `list`. */
export function addRecent(list: readonly string[], id: string): string[] {
  if (!VALID_ID.test(id)) return [...list];
  return [id, ...list.filter((existing) => existing !== id)].slice(0, RECENT_MAX);
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readRecent(storage: Storage | null = getStorage()): string[] {
  if (!storage) return [];
  try {
    return parseRecent(storage.getItem(RECENT_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeRecent(ids: readonly string[], storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids.slice(0, RECENT_MAX)));
  } catch {
    // Quota or blocked storage: the strip is a convenience, so give up quietly.
  }
}

/** Records a product view and returns the updated history. */
export function recordRecentView(id: string, storage: Storage | null = getStorage()): string[] {
  const next = addRecent(readRecent(storage), id);
  writeRecent(next, storage);
  return next;
}
