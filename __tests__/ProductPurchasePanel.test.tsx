import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CART_STORAGE_KEY, CartProvider } from "@/components/merchandise/CartContext";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import ProductDetailActions from "@/components/merchandise/ProductDetailActions";
import ProductGallery from "@/components/merchandise/ProductGallery";
import { ProductSelectionProvider } from "@/components/merchandise/ProductSelectionContext";
import type { CatalogProduct } from "@/lib/merchCatalog";

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "vest",
    name: "Test Vest",
    category: "Apparel",
    brand: "Essentials",
    description: "A vest.",
    image: "/images/merch/vest.webp",
    tiers: [
      { quantity: 6, price: 100 },
      { quantity: 12, price: 90 },
    ],
    imprintArea: { top: 40, left: 50, width: 20 },
    ...overrides,
  };
}

function renderPage(p: CatalogProduct) {
  return render(
    <LogoProvider>
      <CartProvider>
        <ProductSelectionProvider product={p}>
          <ProductGallery product={p} />
          <ProductDetailActions product={p} />
        </ProductSelectionProvider>
      </CartProvider>
    </LogoProvider>
  );
}

const addToCart = () => screen.getByRole("button", { name: "Add to Cart" });
const swatch = (name: string) => screen.getByRole("button", { name: `Select color ${name}` });
const storedCart = () => JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]");

describe("product page purchase panel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/merchandise/vest");
  });

  describe("2 or more colors", () => {
    const colors = ["Black", "Iron", "Navy"];

    it("preselects nothing and shows 'Please select a color' instead of adding", () => {
      renderPage(product({ colors }));
      for (const color of colors) {
        expect(swatch(color)).toHaveAttribute("aria-pressed", "false");
      }

      fireEvent.click(addToCart());

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Please select a color");
      // Next to the swatches, and focus moves to the swatch group.
      const group = screen.getByRole("group", { name: "Available colors" });
      expect(group.closest("#colors")).toContainElement(alert);
      expect(group).toHaveAttribute("aria-describedby", alert.id);
      expect(group).toHaveFocus();
      expect(storedCart()).toEqual([]);
      expect(screen.queryByText(/Added to cart/)).not.toBeInTheDocument();
    });

    it("clears the error once a color is picked and then adds that color", () => {
      renderPage(product({ colors }));
      fireEvent.click(addToCart());
      expect(screen.getByRole("alert")).toBeInTheDocument();

      fireEvent.click(swatch("Iron"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(swatch("Iron")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("selected-color")).toHaveTextContent("Iron x 6");

      fireEvent.click(addToCart());
      expect(storedCart()).toEqual([{ productId: "vest", color: "Iron", quantity: 6 }]);
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Added to cart: Iron x 6");
      expect(within(status).getByRole("link", { name: /View cart/ })).toHaveAttribute(
        "href",
        "/merchandise/cart"
      );
      expect(status).toHaveTextContent(/keep shopping/i);
    });

    it("adds a second color as its own line", () => {
      renderPage(product({ colors }));
      fireEvent.click(swatch("Black"));
      fireEvent.click(addToCart());
      fireEvent.click(swatch("Navy"));
      // The earlier confirmation is dropped when the color changes.
      expect(screen.queryByText(/Added to cart: Black/)).not.toBeInTheDocument();
      fireEvent.click(addToCart());
      expect(storedCart()).toEqual([
        { productId: "vest", color: "Black", quantity: 6 },
        { productId: "vest", color: "Navy", quantity: 6 },
      ]);
    });

    it("preselects the color from ?color= when it matches exactly", () => {
      window.history.pushState({}, "", "/merchandise/vest?color=Navy");
      renderPage(product({ colors }));
      expect(swatch("Navy")).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(addToCart());
      expect(storedCart()).toEqual([{ productId: "vest", color: "Navy", quantity: 6 }]);
    });

    it("ignores ?color= values that are not an exact match", () => {
      window.history.pushState({}, "", "/merchandise/vest?color=navy");
      renderPage(product({ colors }));
      for (const color of colors) expect(swatch(color)).toHaveAttribute("aria-pressed", "false");
    });

    it("swaps the photo to the selected color's own image", () => {
      renderPage(product({ colors, colorImages: { Navy: "/images/merch/vest-navy.webp" } }));
      fireEvent.click(swatch("Navy"));
      expect(screen.getByAltText("Test Vest in Navy").getAttribute("src")).toContain(
        encodeURIComponent("/images/merch/vest-navy.webp")
      );
    });

    it("keeps the standard-photo note when a color has no photo of its own", () => {
      renderPage(product({ colors, colorImages: { Navy: "/images/merch/vest-navy.webp" } }));
      fireEvent.click(swatch("Iron"));
      expect(screen.getByText(/Showing the standard product photo/)).toBeInTheDocument();
    });

    it("updates the price line with the selected color and quantity", () => {
      renderPage(product({ colors }));
      fireEvent.click(swatch("Black"));
      fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "12" } });
      expect(screen.getByTestId("selected-color")).toHaveTextContent("Black x 12");
      expect(screen.getByText("$90.00 / unit at 12+")).toBeInTheDocument();
      expect(screen.getByText("$1,080.00")).toBeInTheDocument();
    });

    it("counts units of other colors already in the cart toward the volume price", () => {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify([{ productId: "vest", color: "Black", quantity: 6 }])
      );
      renderPage(product({ colors }));
      fireEvent.click(swatch("Navy"));
      // 6 in the cart + 6 here = 12 units, so the 12+ price applies.
      expect(screen.getByText("$90.00 / unit at 12+")).toBeInTheDocument();
      expect(screen.getByText(/Includes the 6 already in your cart/)).toBeInTheDocument();
    });
  });

  describe("exactly 1 color", () => {
    it("selects the color automatically and adds it without any prompt", () => {
      renderPage(product({ colors: ["Natural"] }));
      expect(swatch("Natural")).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByText(/Clear selection/)).not.toBeInTheDocument();

      fireEvent.click(addToCart());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(storedCart()).toEqual([{ productId: "vest", color: "Natural", quantity: 6 }]);
      expect(screen.getByRole("status")).toHaveTextContent("Added to cart: Natural x 6");
    });

    it("does not show the missing-photo note for an auto-selected color", () => {
      renderPage(product({ colors: ["Natural"] }));
      expect(screen.queryByText(/Showing the standard product photo/)).not.toBeInTheDocument();
    });
  });

  describe("no colors", () => {
    it("shows no color UI and adds a colorless line", () => {
      renderPage(product());
      expect(screen.queryByRole("group", { name: "Available colors" })).not.toBeInTheDocument();
      expect(screen.queryByTestId("selected-color")).not.toBeInTheDocument();

      fireEvent.click(addToCart());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(storedCart()).toEqual([{ productId: "vest", quantity: 6 }]);
      expect(screen.getByRole("status")).toHaveTextContent("Added to cart: 6 units");
    });
  });
});
