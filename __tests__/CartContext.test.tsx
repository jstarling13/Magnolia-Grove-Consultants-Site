import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import {
  addLine,
  CART_STORAGE_KEY,
  CartProvider,
  parseStoredCart,
  recolorLine,
  useCart,
} from "@/components/merchandise/CartContext";

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

function storedCart(): unknown {
  return JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "null");
}

describe("CartProvider", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps each (product, color) as its own line", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem("vest", 6, "Navy");
      result.current.addItem("vest", 12, "Black");
    });
    expect(result.current.items).toEqual([
      { productId: "vest", color: "Navy", quantity: 6 },
      { productId: "vest", color: "Black", quantity: 12 },
    ]);
    expect(result.current.itemCount).toBe(18);
  });

  it("adding the same product and color again increases that line", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem("vest", 6, "Navy");
      result.current.addItem("vest", 4, "Navy");
    });
    expect(result.current.items).toEqual([{ productId: "vest", color: "Navy", quantity: 10 }]);
  });

  it("updates and removes a single color line without touching its siblings", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem("vest", 6, "Navy");
      result.current.addItem("vest", 6, "Black");
    });
    act(() => result.current.updateQuantity("vest", 9, "Navy"));
    expect(result.current.items).toEqual([
      { productId: "vest", color: "Navy", quantity: 9 },
      { productId: "vest", color: "Black", quantity: 6 },
    ]);
    act(() => result.current.updateQuantity("vest", 0, "Navy"));
    expect(result.current.items).toEqual([{ productId: "vest", color: "Black", quantity: 6 }]);
    act(() => result.current.removeItem("vest", "Black"));
    expect(result.current.items).toEqual([]);
  });

  it("supports products without colors", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem("mug", 50);
      result.current.addItem("mug", 10);
    });
    expect(result.current.items).toEqual([{ productId: "mug", quantity: 60 }]);
    act(() => result.current.removeItem("mug"));
    expect(result.current.items).toEqual([]);
  });

  it("persists to localStorage and restores on mount", () => {
    const first = renderHook(() => useCart(), { wrapper });
    act(() => first.result.current.addItem("vest", 6, "Navy"));
    expect(storedCart()).toEqual([{ productId: "vest", color: "Navy", quantity: 6 }]);
    first.unmount();

    const second = renderHook(() => useCart(), { wrapper });
    expect(second.result.current.items).toEqual([{ productId: "vest", color: "Navy", quantity: 6 }]);
    expect(second.result.current.itemCount).toBe(6);
  });

  it("reads an old { productId, quantity } cart as colorless lines without crashing", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ productId: "vest", quantity: 24 }]));
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([{ productId: "vest", quantity: 24 }]);
    expect(result.current.items[0].color).toBeUndefined();
    expect(result.current.itemCount).toBe(24);
  });

  it("starts empty when storage holds corrupt data", () => {
    for (const bad of ["{not json", '{"a":1}', "null", '"str"', "42"]) {
      window.localStorage.setItem(CART_STORAGE_KEY, bad);
      const { result, unmount } = renderHook(() => useCart(), { wrapper });
      expect(result.current.items).toEqual([]);
      unmount();
    }
  });

  it("changeColor fixes a legacy line and merges into an existing same-color line", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: "vest", quantity: 6 },
        { productId: "vest", color: "Black", quantity: 6 },
      ])
    );
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.changeColor("vest", undefined, "Black"));
    expect(result.current.items).toEqual([{ productId: "vest", color: "Black", quantity: 12 }]);
  });
});

describe("pure cart helpers", () => {
  it("parseStoredCart drops malformed entries and folds duplicates", () => {
    const raw = JSON.stringify([
      { productId: "a", quantity: 2 },
      { productId: "a", quantity: 3 },
      { productId: "a", color: "Red", quantity: 1 },
      { productId: "", quantity: 1 },
      { productId: "b", quantity: 0 },
      { productId: "c", quantity: "5" },
      { productId: "d", quantity: 2.9, color: 7 },
      null,
      "x",
    ]);
    expect(parseStoredCart(raw)).toEqual([
      { productId: "a", quantity: 5 },
      { productId: "a", color: "Red", quantity: 1 },
      { productId: "d", quantity: 2 },
    ]);
  });

  it("addLine ignores non-positive quantities and treats blank color as none", () => {
    expect(addLine([], "a", 0, "Red")).toEqual([]);
    expect(addLine([], "a", 3, "  ")).toEqual([{ productId: "a", quantity: 3 }]);
  });

  it("recolorLine keeps position when no merge is needed", () => {
    const items = [
      { productId: "a", quantity: 1 },
      { productId: "b", quantity: 2 },
    ];
    expect(recolorLine(items, "a", undefined, "Red")).toEqual([
      { productId: "a", color: "Red", quantity: 1 },
      { productId: "b", quantity: 2 },
    ]);
  });
});
