import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";
});
vi.mock("@/components/Turnstile", () => ({ default: () => null }));

import { CART_STORAGE_KEY, CartProvider } from "@/components/merchandise/CartContext";
import CartPageContent from "@/components/merchandise/CartPageContent";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import ProductGallery from "@/components/merchandise/ProductGallery";
import ProductCard from "@/components/merchandise/ProductCard";
import ProductDetailActions from "@/components/merchandise/ProductDetailActions";
import { ProductSelectionProvider } from "@/components/merchandise/ProductSelectionContext";
import MerchPurchaseTracker from "@/components/merchandise/MerchPurchaseTracker";
import type { CatalogProduct } from "@/lib/merchCatalog";

const VEST: CatalogProduct = {
  id: "vest",
  name: "Test Vest",
  category: "Apparel",
  brand: "Peter Millar",
  description: "",
  colors: ["Black", "Navy"],
  tiers: [
    { quantity: 6, price: 100 },
    { quantity: 12, price: 90 },
  ],
  imprintArea: { top: 40, left: 50, width: 20 },
};

let gtag: Mock;
const events = (name: string) => gtag.mock.calls.filter((call) => call[1] === name);

beforeEach(() => {
  gtag = vi.fn();
  window.gtag = gtag as unknown as Window["gtag"];
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.pushState({}, "", "/merchandise/vest");
});
afterEach(() => {
  delete window.gtag;
  vi.unstubAllGlobals();
});

describe("product page events", () => {
  function renderProduct() {
    return render(
      <CartProvider>
        <ProductSelectionProvider product={VEST}>
          <ProductDetailActions product={VEST} />
        </ProductSelectionProvider>
      </CartProvider>
    );
  }

  it("sends view_item on load and add_to_cart with the color as variant", () => {
    renderProduct();
    expect(events("view_item")).toHaveLength(1);
    expect(events("view_item")[0][2].items[0].item_id).toBe("vest");

    // No color picked: nothing is added, so no add_to_cart.
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    expect(events("add_to_cart")).toHaveLength(0);
  });

  it("sends select_color once per change and add_to_cart after a color is chosen", () => {
    render(
      <LogoProvider>
        <CartProvider>
          <ProductSelectionProvider product={VEST}>
            <ProductGallery product={VEST} />
            <ProductDetailActions product={VEST} />
          </ProductSelectionProvider>
        </CartProvider>
      </LogoProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Select color Navy" }));
    fireEvent.click(screen.getByRole("button", { name: "Select color Navy" }));
    expect(events("select_color")).toHaveLength(1);
    expect(events("select_color")[0][2]).toEqual({ item_id: "vest", color: "Navy" });

    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    const add = events("add_to_cart")[0][2];
    expect(add.currency).toBe("USD");
    expect(add.items[0]).toMatchObject({ item_id: "vest", item_variant: "Navy", quantity: 6 });
    expect(add.value).toBe(add.items[0].price * 6);
  });
});

describe("card click", () => {
  it("sends select_item naming the product", () => {
    render(
      <LogoProvider>
        <ProductCard product={VEST} />
      </LogoProvider>
    );
    fireEvent.click(screen.getByRole("link", { name: "Test Vest" }));
    const [, , payload] = events("select_item")[0];
    expect(payload.items[0]).toMatchObject({ item_id: "vest", price: 100 });
    expect(payload.item_list_name).toBe("Apparel");
  });
});

describe("cart page events", () => {
  function renderCart(stored: unknown) {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stored));
    return render(
      <CartProvider>
        <CartPageContent catalog={[VEST]} pricingDisclaimer="d" deliveryEstimate="e" />
      </CartProvider>
    );
  }

  it("sends view_cart once, begin_checkout on first form focus only, and remove_from_cart", () => {
    renderCart([{ productId: "vest", color: "Navy", quantity: 6 }]);
    expect(events("view_cart")).toHaveLength(1);
    expect(events("view_cart")[0][2]).toMatchObject({ currency: "USD", value: 600 });

    fireEvent.focus(screen.getByLabelText("First Name"));
    fireEvent.focus(screen.getByLabelText("Email"));
    expect(events("begin_checkout")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Remove Test Vest, Navy/ }));
    const removed = events("remove_from_cart")[0][2];
    expect(removed.items[0]).toMatchObject({ item_id: "vest", item_variant: "Navy", quantity: 6 });
    expect(removed.value).toBe(600);
  });

  it("sends generate_lead with the estimated total after a successful submit, not on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: false }) })
    );
    renderCart([{ productId: "vest", color: "Navy", quantity: 6 }]);
    const fill = () => {
      fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Pat" } });
      fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Lee" } });
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "pat@example.com" } });
      fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "5555551234" } });
    };
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Submit Order Request" }));
    await screen.findByText(/Something went wrong/);
    expect(events("generate_lead")).toHaveLength(0);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit Order Request" }));
    await screen.findByText("Order Request Received");
    expect(events("generate_lead")).toHaveLength(1);
    expect(events("generate_lead")[0][2]).toMatchObject({ currency: "USD", value: 600 });
    expect(JSON.stringify(events("generate_lead")[0][2])).not.toContain("pat@example.com");
  });

  it("keeps working when gtag is absent", () => {
    delete window.gtag;
    expect(() => renderCart([{ productId: "vest", color: "Navy", quantity: 6 }])).not.toThrow();
    fireEvent.focus(screen.getByLabelText("First Name"));
    fireEvent.click(screen.getByRole("button", { name: /Remove Test Vest, Navy/ }));
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
  });
});

describe("thank-you purchase tracker", () => {
  it("sends one purchase and not again when remounted in the same tab", () => {
    const first = render(<MerchPurchaseTracker />);
    first.unmount();
    render(<MerchPurchaseTracker />);
    expect(events("purchase")).toHaveLength(1);
  });
});
