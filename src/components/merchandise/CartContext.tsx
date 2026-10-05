"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
}

interface CartContextValue {
  items: CartLineItem[];
  itemCount: number;
  /** Adds `quantity` to the (productId, color) line, creating it if needed. */
  addItem: (productId: string, quantity: number, color?: string) => void;
  /** Sets the quantity of one line; zero or less removes it. */
  updateQuantity: (productId: string, quantity: number, color?: string) => void;
  removeItem: (productId: string, color?: string) => void;
  /** Re-colors a line (used to fix legacy lines), merging into an existing same-color line. */
  changeColor: (productId: string, fromColor: string | undefined, toColor: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CART_STORAGE_KEY = "mg-merch-cart";

function sameLine(item: CartLineItem, productId: string, color: string | undefined): boolean {
  return item.productId === productId && cleanLineColor(item.color) === cleanLineColor(color);
}

function makeLine(productId: string, color: string | undefined, quantity: number): CartLineItem {
  const cleaned = cleanLineColor(color);
  return cleaned ? { productId, color: cleaned, quantity } : { productId, quantity };
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
    // Merge into the line that already has the target color.
    return withoutSource.map((item) =>
      sameLine(item, productId, toColor)
        ? { ...item, quantity: item.quantity + source.quantity }
        : item
    );
  }
  // Keep the line where it was so the cart doesn't reshuffle under the shopper.
  return items.map((item) =>
    item === source ? makeLine(productId, toColor, item.quantity) : item
  );
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
    const { productId, color, quantity } = entry as Record<string, unknown>;
    if (typeof productId !== "string" || !productId) continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 1) continue;
    const line = makeLine(
      productId,
      typeof color === "string" ? color : undefined,
      Math.floor(quantity)
    );
    const key = cartLineKey(line.productId, line.color);
    const existing = merged.get(key);
    if (existing) existing.quantity += line.quantity;
    else merged.set(key, line);
  }
  return Array.from(merged.values());
}

function readStoredCart(): CartLineItem[] {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    // Storage blocked or unavailable.
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
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

  const clear = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, itemCount, addItem, updateQuantity, removeItem, changeColor, clear }}
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
