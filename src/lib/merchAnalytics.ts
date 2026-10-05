/**
 * Google Analytics 4 ecommerce events for the merchandise storefront.
 *
 * The builders are pure and take only customer-facing fields (id, name,
 * category, brand, color, customer unit price, quantity). Each one copies
 * fields out explicitly instead of spreading its input, so supplier/ESP data
 * can never ride along even if a caller passes a fuller product object.
 *
 * Sending goes through sendGaEvent, which is a no-op when
 * NEXT_PUBLIC_GA_MEASUREMENT_ID is unset or gtag hasn't loaded, and never
 * throws. Nothing here is awaited, so analytics can't delay navigation or a
 * form submit.
 */

import { cleanColorName } from "@/lib/colorSwatches";
import { GA_MEASUREMENT_ID, sendGaEvent } from "@/lib/gtag";
import { isRealBrand, startingTier, type CatalogProduct } from "@/lib/merchCatalog";

export const CURRENCY = "USD";
/** Items sent with a single list event; keeps the hit small on a 150-product catalog. */
export const MAX_LIST_ITEMS = 24;
export const SEARCH_DEBOUNCE_MS = 800;
const MAX_SEARCH_TERM_LENGTH = 100;
const MIN_SEARCH_TERM_LENGTH = 2;

/** The only product fields analytics reads. */
export type AnalyticsProduct = Pick<CatalogProduct, "id" | "name" | "category" | "brand">;
/** Same, plus customer price tiers, for events that quote a "from" price. */
export type ListableProduct = AnalyticsProduct & Pick<CatalogProduct, "tiers">;

export interface GaItem {
  item_id: string;
  item_name: string;
  item_category: string;
  /** Omitted for unbranded ("Essentials") products. */
  item_brand?: string;
  /** The color. */
  item_variant?: string;
  /** Customer-facing unit price, USD. */
  price?: number;
  quantity?: number;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
}

export interface GaItemOptions {
  price?: number;
  quantity?: number;
  color?: string;
  index?: number;
  listName?: string;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function cleanColor(color: string | undefined): string | undefined {
  const value = typeof color === "string" ? cleanColorName(color) : "";
  return value || undefined;
}

export function listId(listName: string): string {
  return listName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildItem(product: AnalyticsProduct, options: GaItemOptions = {}): GaItem {
  const item: GaItem = {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
  };
  if (isRealBrand(product.brand)) item.item_brand = product.brand.trim();
  const variant = cleanColor(options.color);
  if (variant) item.item_variant = variant;
  if (typeof options.price === "number" && Number.isFinite(options.price)) {
    item.price = roundCents(options.price);
  }
  if (typeof options.quantity === "number" && Number.isFinite(options.quantity)) {
    item.quantity = Math.max(1, Math.floor(options.quantity));
  }
  if (typeof options.index === "number") item.index = options.index;
  if (options.listName) {
    item.item_list_id = listId(options.listName);
    item.item_list_name = options.listName;
  }
  return item;
}

function fromPrice(product: ListableProduct): number | undefined {
  return product.tiers?.length ? startingTier(product).price : undefined;
}

export function buildViewItemList(listName: string, products: readonly ListableProduct[]) {
  return {
    item_list_id: listId(listName),
    item_list_name: listName,
    items: products
      .slice(0, MAX_LIST_ITEMS)
      .map((product, index) => buildItem(product, { price: fromPrice(product), index, listName })),
  };
}

export function buildSelectItem(
  listName: string,
  product: ListableProduct,
  options: { index?: number; color?: string } = {}
) {
  return {
    item_list_id: listId(listName),
    item_list_name: listName,
    items: [
      buildItem(product, {
        price: fromPrice(product),
        color: options.color,
        index: options.index,
        listName,
      }),
    ],
  };
}

export function buildViewItem(product: ListableProduct) {
  const price = fromPrice(product);
  return {
    currency: CURRENCY,
    ...(price !== undefined ? { value: roundCents(price) } : {}),
    items: [buildItem(product, { price })],
  };
}

export function buildSelectColor(productId: string, color: string) {
  return { item_id: productId, color: cleanColor(color) ?? color };
}

export interface CartEventLine {
  product: AnalyticsProduct;
  color?: string;
  quantity: number;
  /** Customer unit price at the tier this line is charged at. */
  unitPrice: number;
}

function lineValue(line: CartEventLine): number {
  return roundCents(line.unitPrice * line.quantity);
}

/** add_to_cart / remove_from_cart: one cart line. */
export function buildCartLineChange(line: CartEventLine) {
  return {
    currency: CURRENCY,
    value: lineValue(line),
    items: [
      buildItem(line.product, {
        price: line.unitPrice,
        quantity: line.quantity,
        color: line.color,
      }),
    ],
  };
}

/**
 * view_cart / begin_checkout / generate_lead: the whole cart. `value` is the
 * customer-facing estimated subtotal; it defaults to the sum of the lines.
 */
export function buildCartSnapshot(lines: readonly CartEventLine[], value?: number) {
  const total =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : lines.reduce((sum, line) => sum + lineValue(line), 0);
  return {
    currency: CURRENCY,
    value: roundCents(total),
    items: lines.map((line, index) =>
      buildItem(line.product, {
        price: line.unitPrice,
        quantity: line.quantity,
        color: line.color,
        index,
      })
    ),
  };
}

/** Normalized search term, or undefined when it isn't worth reporting. */
export function cleanSearchTerm(term: string): string | undefined {
  const value = term.replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_TERM_LENGTH);
  return value.length >= MIN_SEARCH_TERM_LENGTH ? value : undefined;
}

export function buildSearch(term: string) {
  const search_term = cleanSearchTerm(term);
  return search_term ? { search_term } : undefined;
}

/**
 * The payment redirect (/thank-you?source=merch&email=...) carries no order id
 * or amount, and the amount is the admin's final quote, not the cart estimate.
 * So purchase is sent without value, items or transaction_id rather than with
 * made-up ones. `store` just labels it as the merchandise store.
 */
export function buildPurchase() {
  return { store: "merch" };
}

// --- Senders ---------------------------------------------------------------

function safely(send: () => void): void {
  try {
    send();
  } catch {
    // Analytics must never break the page.
  }
}

/** The list the shopper is currently browsing, so card clicks can name it. */
let activeListName: string | undefined;

export function setActiveList(listName: string | undefined): void {
  activeListName = listName;
}

export function trackViewItemList(listName: string, products: readonly ListableProduct[]): void {
  if (products.length === 0) return;
  safely(() => sendGaEvent("view_item_list", buildViewItemList(listName, products)));
}

export function trackSelectItem(
  product: ListableProduct,
  options: { color?: string; related?: boolean } = {}
): void {
  safely(() => {
    const listName = options.related ? "Related products" : (activeListName ?? product.category);
    sendGaEvent("select_item", buildSelectItem(listName, product, { color: options.color }));
  });
}

export function trackViewItem(product: ListableProduct): void {
  safely(() => sendGaEvent("view_item", buildViewItem(product)));
}

export function trackSelectColor(productId: string, color: string): void {
  safely(() => sendGaEvent("select_color", buildSelectColor(productId, color)));
}

export function trackAddToCart(line: CartEventLine): void {
  safely(() => sendGaEvent("add_to_cart", buildCartLineChange(line)));
}

export function trackRemoveFromCart(line: CartEventLine): void {
  safely(() => sendGaEvent("remove_from_cart", buildCartLineChange(line)));
}

export function trackViewCart(lines: readonly CartEventLine[], value?: number): void {
  if (lines.length === 0) return;
  safely(() => sendGaEvent("view_cart", buildCartSnapshot(lines, value)));
}

export function trackBeginCheckout(lines: readonly CartEventLine[], value?: number): void {
  if (lines.length === 0) return;
  safely(() => sendGaEvent("begin_checkout", buildCartSnapshot(lines, value)));
}

export function trackGenerateLead(lines: readonly CartEventLine[], value?: number): void {
  if (lines.length === 0) return;
  safely(() => sendGaEvent("generate_lead", buildCartSnapshot(lines, value)));
}

// Search: report what the shopper settled on, not every keystroke.
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let lastSearchSent: string | undefined;

/**
 * Schedules a `search` event after the shopper stops typing for
 * SEARCH_DEBOUNCE_MS. A newer term replaces a pending one, and the same term
 * is never sent twice in a row.
 */
export function scheduleSearchEvent(term: string, delayMs = SEARCH_DEBOUNCE_MS): void {
  if (typeof window === "undefined") return;
  if (searchTimer !== undefined) clearTimeout(searchTimer);
  searchTimer = undefined;
  const payload = buildSearch(term);
  if (!payload) return;
  searchTimer = setTimeout(() => {
    searchTimer = undefined;
    if (payload.search_term === lastSearchSent) return;
    lastSearchSent = payload.search_term;
    safely(() => sendGaEvent("search", payload));
  }, delayMs);
}

/** Clears search state; used by tests. */
export function resetSearchTracking(): void {
  if (searchTimer !== undefined) clearTimeout(searchTimer);
  searchTimer = undefined;
  lastSearchSent = undefined;
}

// --- Purchase (thank-you page) ---------------------------------------------

export const PURCHASE_STORAGE_KEY = "mg-merch-purchase-tracked";

function isReload(): boolean {
  try {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entry?.type === "reload";
  } catch {
    return false;
  }
}

/**
 * Sends `purchase` once per browser tab session. A reload of the thank-you
 * page, or a second visit in the same tab, sends nothing. If sessionStorage is
 * unavailable we can't tell, so we send nothing rather than risk a double
 * count. The "sent" flag is only set after gtag accepted the event, so a call
 * made before gtag has loaded can simply be retried. Returns true only when an
 * event was sent.
 */
export function trackMerchPurchaseOnce(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.sessionStorage.getItem(PURCHASE_STORAGE_KEY)) return false;
    if (isReload()) return false;
    if (!sendGaEvent("purchase", buildPurchase())) return false;
    window.sessionStorage.setItem(PURCHASE_STORAGE_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/**
 * gtag is defined by a script that loads after hydration, so the page's first
 * effect can run before it exists. Try now, then every `intervalMs` up to
 * `attempts` times. Stops as soon as the event is sent or the page has
 * already reported it. Returns a cancel function for effect cleanup.
 */
export function trackMerchPurchaseWhenReady(attempts = 10, intervalMs = 500): () => void {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return () => undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let remaining = attempts;
  const attempt = () => {
    timer = undefined;
    if (trackMerchPurchaseOnce() || alreadyReported()) return;
    remaining -= 1;
    if (remaining > 0) timer = setTimeout(attempt, intervalMs);
  };
  attempt();
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
}

function alreadyReported(): boolean {
  try {
    return Boolean(window.sessionStorage.getItem(PURCHASE_STORAGE_KEY)) || isReload();
  } catch {
    return true;
  }
}
