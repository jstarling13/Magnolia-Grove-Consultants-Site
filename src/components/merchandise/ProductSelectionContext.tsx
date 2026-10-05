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
  type RefObject,
} from "react";
import type { CatalogProduct } from "@/lib/merchCatalog";
import { trackSelectColor } from "@/lib/merchAnalytics";

/**
 * The shopper's color choice on a product page. The gallery (photo swap and
 * swatches) and the purchase panel (Add to Cart) both read it from here so
 * the swatch, the photo and what lands in the cart always agree.
 *
 * Rules: no colors -> no color UI; exactly one color -> selected for the
 * shopper; two or more -> nothing is selected until they pick one (or the
 * URL carries ?color=<exact color>, which catalog cards pass).
 */
interface ProductSelectionValue {
  colors: string[];
  /** The color that will be added to the cart, if any. */
  selectedColor: string | undefined;
  /** True when the only color was selected for the shopper rather than by them. */
  autoSelected: boolean;
  selectColor: (color: string) => void;
  clearColor: () => void;
  /** Shown inline next to the swatches after trying to add with no color. */
  colorError: boolean;
  /**
   * Call before adding to the cart. Returns true when the selection is
   * complete; otherwise shows the error and moves focus to the swatches.
   */
  requireColor: () => boolean;
  swatchGroupRef: RefObject<HTMLDivElement>;
}

const ProductSelectionContext = createContext<ProductSelectionValue | null>(null);

export const COLOR_REQUIRED_MESSAGE = "Please select a color";

export function ProductSelectionProvider({
  product,
  children,
}: {
  product: Pick<CatalogProduct, "id" | "colors">;
  children: ReactNode;
}) {
  const colors = useMemo(() => product.colors ?? [], [product.colors]);
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [colorError, setColorError] = useState(false);
  const swatchGroupRef = useRef<HTMLDivElement>(null);

  const autoSelected = colors.length === 1;
  const selectedColor = autoSelected ? colors[0] : chosen;

  // Cards link here with ?color=<name>. Read after mount (not during render)
  // to keep hydration clean.
  useEffect(() => {
    if (colors.length < 2) return;
    const requested = new URLSearchParams(window.location.search).get("color");
    if (requested && colors.includes(requested)) setChosen(requested);
  }, [product.id, colors]);

  const productId = product.id;
  const selectColor = useCallback(
    (color: string) => {
      if (color !== chosen) trackSelectColor(productId, color);
      setChosen(color);
      setColorError(false);
    },
    [productId, chosen]
  );

  const clearColor = useCallback(() => setChosen(undefined), []);

  const requireColor = useCallback(() => {
    if (colors.length === 0 || selectedColor) return true;
    setColorError(true);
    swatchGroupRef.current?.focus();
    return false;
  }, [colors.length, selectedColor]);

  const value = useMemo<ProductSelectionValue>(
    () => ({
      colors,
      selectedColor,
      autoSelected,
      selectColor,
      clearColor,
      colorError,
      requireColor,
      swatchGroupRef,
    }),
    [colors, selectedColor, autoSelected, selectColor, clearColor, colorError, requireColor]
  );

  return (
    <ProductSelectionContext.Provider value={value}>{children}</ProductSelectionContext.Provider>
  );
}

export function useProductSelection(): ProductSelectionValue {
  const ctx = useContext(ProductSelectionContext);
  if (!ctx) throw new Error("useProductSelection must be used within a ProductSelectionProvider");
  return ctx;
}
