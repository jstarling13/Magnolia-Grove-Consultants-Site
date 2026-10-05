import "server-only";
import curated from "./espLinks.curated.json";
import imported from "./espLinks.imported.json";

/**
 * Backend-only ESP+ links. This module must never be imported from a client
 * component or from anything that feeds serialized product data to the
 * browser: the URLs it produces are for the business's order workflow only
 * (admin dashboard, admin notification email). `server-only` makes the build
 * fail if a client bundle ever pulls it in.
 */

export interface EspLinkEntry {
  espId?: string;
  supplier?: string;
  asi?: string;
  productNo?: string;
}

export type EspLinkKind = "product" | "search";

export interface EspLink {
  url: string;
  kind: EspLinkKind;
  supplier?: string;
  asi?: string;
  productNo?: string;
}

const ESP_PRODUCT_BASE = "https://espplus.com/products";

// Curated entries win over imported ones, field by field.
const entries = new Map<string, EspLinkEntry>();
for (const source of [imported, curated] as Record<string, EspLinkEntry>[]) {
  for (const [productId, entry] of Object.entries(source)) {
    if (!entry || typeof entry !== "object") continue;
    const merged: EspLinkEntry = { ...entries.get(productId) };
    for (const key of ["espId", "supplier", "asi", "productNo"] as const) {
      const value = entry[key];
      if (typeof value === "string" && value.trim()) merged[key] = value.trim();
    }
    entries.set(productId, merged);
  }
}

export function espSearchUrl(name: string): string {
  return `${ESP_PRODUCT_BASE}?q=${encodeURIComponent(name)}&searchType=products`;
}

/** Every product gets a usable link: a direct product page when we know the ESP id, otherwise an ESP+ search. */
export function getEspLink(product: { id: string; name: string }): EspLink {
  const entry = entries.get(product.id);
  const meta = {
    ...(entry?.supplier ? { supplier: entry.supplier } : {}),
    ...(entry?.asi ? { asi: entry.asi } : {}),
    ...(entry?.productNo ? { productNo: entry.productNo } : {}),
  };
  if (entry?.espId) {
    return {
      url: `${ESP_PRODUCT_BASE}/${encodeURIComponent(entry.espId)}`,
      kind: "product",
      ...meta,
    };
  }
  return { url: espSearchUrl(product.name), kind: "search", ...meta };
}

/** Every ESP id in the data files; used by leak checks. */
export function allEspIds(): string[] {
  return [...entries.values()].flatMap((e) => (e.espId ? [e.espId] : []));
}
