"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CART_FORM_LIMITS, cleanLineDetail } from "@/lib/cartFormRules";
import { cartLineKey, cleanLineColor } from "@/lib/cartPricing";

/**
 * One cart line. Like a real store, every distinct (product, color) is its
 * own line. `color` is undefined for products without colors and for carts
 * saved before colors were recorded ("legacy" lines).
 */
export interface CartLineItem {
  productId: string;
  color?: string;
  quantity: number;
  /**
   * Optional size breakdown typed on the cart page ("24 M, 60 L, 60 XL").
   * Saved with the line. Carts saved before this existed simply lack it.
   */
  sizes?: string;
  /** Optional imprint notes typed on the cart page (location, ink color). */
  imprintNotes?: string;
}

/** The free-text details a shopper can add to a line. */
export interface LineDetails {
  sizes?: string;
  imprintNotes?: string;
}

interface CartContextValue {
  items: CartLineItem[];
  /** Total units across every line. */
  itemCount: number;
  /** Number of distinct (product, color) lines; what the header badge shows. */
  lineCount: number;
  /** True once the saved cart has been read from storage (it loads after mount). */
  hydrated: boolean;
  /** How many saved lines were dropped on load because their product is gone or hidden. */
  removedUnavailableCount: number;
  /** Adds `quantity` to the (productId, color) line, creating it if needed. */
  addItem: (productId: string, quantity: number, color?: string) => void;
  /** Sets the quantity of one line; zero or less removes it. */
  updateQuantity: (productId: string, quantity: number, color?: string) => void;
  removeItem: (productId: string, color?: string) => void;
  /** Sets or clears the sizes and imprint notes on one line. Blank text clears a field. */
  setLineDetails: (productId: string, color: string | undefined, details: LineDetails) => void;
  /** Re-colors a line (used to fix legacy lines), merging into an existing same-color line. */
  changeColor: (productId: string, fromColor: string | undefined, toColor: string) => void;
  clear: () => void;
  /**
   * Drops every line of the given products because they no longer exist, and
   * counts them for the "no longer available" notice.
   */
  removeProducts: (productIds: readonly string[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CART_STORAGE_KEY = "mg-merch-cart";

function sameLine(item: CartLineItem, productId: string, color: string | undefined): boolean {
  return item.productId === productId && cleanLineColor(item.color) === cleanLineColor(color);
}

function makeLine(
  productId: string,
  color: string | undefined,
  quantity: number,
  details: LineDetails = {}
): CartLineItem {
  const cleaned = cleanLineColor(color);
  const base: CartLineItem = cleaned
    ? { productId, color: cleaned, quantity }
    : { productId, quantity };
  // Saved lines hold only what the shopper actually typed: no empty keys.
  if (details.sizes) base.sizes = details.sizes;
  if (details.imprintNotes) base.imprintNotes = details.imprintNotes;
  return base;
}

/** Text with something in it, cut to the limit but not trimmed, so a shopper can type spaces between words. */
function keepTyping(value: string | undefined): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value.slice(0, CART_FORM_LIMITS.lineDetailMax);
}

/** Pure cart transitions, exported so they can be tested without React. */
export function addLine(
  items: CartLineItem[],
  productId: string,
  quantity: number,
  color?: string
): CartLineItem[] {
  if (!Number.isFinite(quantity) || quantity <= 0) return items;
  const whole = Math.floor(quantity);
  if (items.some((item) => sameLine(item, productId, color))) {
    return items.map((item) =>
      sameLine(item, productId, color) ? { ...item, quantity: item.quantity + whole } : item
    );
  }
  return [...items, makeLine(productId, color, whole)];
}

export function setLineQuantity(
  items: CartLineItem[],
  productId: string,
  quantity: number,
  color?: string
): CartLineItem[] {
  if (!Number.isFinite(quantity) || quantity <= 0) return removeLine(items, productId, color);
  const whole = Math.floor(quantity);
  return items.map((item) =>
    sameLine(item, productId, color) ? { ...item, quantity: whole } : item
  );
}

export function removeLine(
  items: CartLineItem[],
  productId: string,
  color?: string
): CartLineItem[] {
  return items.filter((item) => !sameLine(item, productId, color));
}

/**
 * Updates the sizes and/or imprint notes of one line. A field that is left out
 * of `details` is kept as it was; blank text clears it.
 */
export function setLineDetails(
  items: CartLineItem[],
  productId: string,
  color: string | undefined,
  details: LineDetails
): CartLineItem[] {
  return items.map((item) => {
    if (!sameLine(item, productId, color)) return item;
    const { sizes: _sizes, imprintNotes: _imprint, ...rest } = item;
    const sizes = "sizes" in details ? keepTyping(details.sizes) : item.sizes;
    const imprintNotes =
      "imprintNotes" in details ? keepTyping(details.imprintNotes) : item.imprintNotes;
    return { ...rest, ...(sizes ? { sizes } : {}), ...(imprintNotes ? { imprintNotes } : {}) };
  });
}

export function recolorLine(
  items: CartLineItem[],
  productId: string,
  fromColor: string | undefined,
  toColor: string
): CartLineItem[] {
  const source = items.find((item) => sameLine(item, productId, fromColor));
  if (!source || sameLine(source, productId, toColor)) return items;
  const withoutSource = removeLine(items, productId, fromColor);
  if (withoutSource.some((item) => sameLine(item, productId, toColor))) {
    // Merge into the line that already has the target color; its own sizes and
    // notes win, and the merged-in line's fill any gap.
    return withoutSource.map((item) =>
      sameLine(item, productId, toColor)
        ? {
            ...item,
            quantity: item.quantity + source.quantity,
            ...(item.sizes || !source.sizes ? {} : { sizes: source.sizes }),
            ...(item.imprintNotes || !source.imprintNotes
              ? {}
              : { imprintNotes: source.imprintNotes }),
          }
        : item
    );
  }
  // Keep the line where it was so the cart doesn't reshuffle under the shopper.
  return items.map((item) =>
    item === source ? makeLine(productId, toColor, item.quantity, source) : item
  );
}

/**
 * Drops lines whose product the storefront no longer sells. Returns the lines
 * that stay and how many were removed.
 */
export function pruneUnavailableLines(
  items: CartLineItem[],
  availableProductIds: ReadonlySet<string>
): { items: CartLineItem[]; removed: number } {
  const kept = items.filter((item) => availableProductIds.has(item.productId));
  return { items: kept, removed: items.length - kept.length };
}

/**
 * Reads whatever is in storage into a clean cart. Accepts the old
 * `{ productId, quantity }` shape (those become colorless lines), drops
 * anything malformed, and folds duplicate (productId, color) entries
 * together. Never throws.
 */
export function parseStoredCart(raw: string | null): CartLineItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const merged = new Map<string, CartLineItem>();
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const { productId, color, quantity, sizes, imprintNotes } = entry as Record<string, unknown>;
    if (typeof productId !== "string" || !productId) continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 1) continue;
    const line = makeLine(
      productId,
      typeof color === "string" ? color : undefined,
      Math.floor(quantity),
      // Older carts have neither field; anything that is not text is dropped.
      { sizes: cleanLineDetail(sizes), imprintNotes: cleanLineDetail(imprintNotes) }
    );
    const key = cartLineKey(line.productId, line.color);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += line.quantity;
      if (!existing.sizes && line.sizes) existing.sizes = line.sizes;
      if (!existing.imprintNotes && line.imprintNotes) existing.imprintNotes = line.imprintNotes;
    } else merged.set(key, line);
  }
  // A real cart never exceeds what the API accepts; this also bounds how many
  // products the cart page will ask for if storage was tampered with.
  return Array.from(merged.values()).slice(0, CART_FORM_LIMITS.maxLines);
}

function readStoredCart(): CartLineItem[] {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    // Storage blocked or unavailable.
    return [];
  }
}

interface CartProviderProps {
  children: ReactNode;
  /**
   * Ids of every product the storefront currently sells. When given, saved
   * lines for any other product (removed or hidden since the shopper added
   * them) are dropped from the cart and from storage as soon as it loads, so
   * they never reach the header count. Omit to keep every saved line.
   */
  availableProductIds?: readonly string[];
}

export function CartProvider({ children, availableProductIds }: CartProviderProps) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [removedUnavailableCount, setRemovedUnavailableCount] = useState(0);

  useEffect(() => {
    const stored = readStoredCart();
    if (availableProductIds) {
      const pruned = pruneUnavailableLines(stored, new Set(availableProductIds));
      setItems(pruned.items);
      setRemovedUnavailableCount(pruned.removed);
    } else {
      setItems(stored);
    }
    setHydrated(true);
    // Only the first load reads storage; later id changes don't re-read it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private browsing / storage disabled — cart just won't persist.
    }
  }, [items, hydrated]);

  const addItem = useCallback((productId: string, quantity: number, color?: string) => {
    setItems((prev) => addLine(prev, productId, quantity, color));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, color?: string) => {
    setItems((prev) => setLineQuantity(prev, productId, quantity, color));
  }, []);

  const removeItem = useCallback((productId: string, color?: string) => {
    setItems((prev) => removeLine(prev, productId, color));
  }, []);

  const changeColor = useCallback(
    (productId: string, fromColor: string | undefined, toColor: string) => {
      setItems((prev) => recolorLine(prev, productId, fromColor, toColor));
    },
    []
  );

  const updateLineDetails = useCallback(
    (productId: string, color: string | undefined, details: LineDetails) => {
      setItems((prev) => setLineDetails(prev, productId, color, details));
    },
    []
  );

  const clear = useCallback(() => setItems([]), []);

  // The latest items, so removeProducts can count what it drops without
  // doing a side effect inside a state updater.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const removeProducts = useCallback((productIds: readonly string[]) => {
    if (productIds.length === 0) return;
    const gone = new Set(productIds);
    const dropped = itemsRef.current.filter((item) => gone.has(item.productId)).length;
    if (dropped === 0) return;
    itemsRef.current = itemsRef.current.filter((item) => !gone.has(item.productId));
    setItems((prev) => prev.filter((item) => !gone.has(item.productId)));
    setRemovedUnavailableCount((n) => n + dropped);
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const lineCount = items.length;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        lineCount,
        hydrated,
        removedUnavailableCount,
        addItem,
        updateQuantity,
        removeItem,
        changeColor,
        setLineDetails: updateLineDetails,
        clear,
        removeProducts,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
