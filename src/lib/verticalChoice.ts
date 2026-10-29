export const VERTICAL_STORAGE_KEY = "mg-vertical-choice";

export type Vertical = "political" | "business";

export function readVertical(): Vertical | null {
  try {
    const v = window.localStorage.getItem(VERTICAL_STORAGE_KEY);
    return v === "political" || v === "business" ? v : null;
  } catch {
    return null;
  }
}

export function saveVertical(value: Vertical) {
  try {
    window.localStorage.setItem(VERTICAL_STORAGE_KEY, value);
  } catch {
    // Private browsing or storage disabled — the gate will just ask again.
  }
}
