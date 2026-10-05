import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CART_STORAGE_KEY, CartProvider } from "@/components/merchandise/CartContext";
import CartPageContent from "@/components/merchandise/CartPageContent";
import type { CatalogProduct } from "@/lib/merchCatalog";

vi.mock("@/components/Turnstile", () => ({ default: () => null }));

const VEST: CatalogProduct = {
  id: "vest",
  name: "Test Vest",
  category: "Apparel",
  brand: "Peter Millar",
  description: "",
  image: "/images/merch/vest.webp",
  colors: ["Black", "Navy"],
  colorImages: { Navy: "/images/merch/vest-navy.webp" },
  tiers: [
    { quantity: 6, price: 100 },
    { quantity: 12, price: 90 },
  ],
  imprintArea: { top: 40, left: 50, width: 20 },
};
const MUG: CatalogProduct = {
  id: "mug",
  name: "Test Mug",
  category: "Drinkware",
  brand: "Essentials",
  description: "",
  image: "/images/merch/mug.webp",
  tiers: [
    { quantity: 1, price: 5 },
    { quantity: 50, price: 4 },
  ],
  imprintArea: { top: 40, left: 50, width: 20 },
};
const CATALOG = [VEST, MUG];

function renderCart(stored: unknown) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stored));
  return render(
    <CartProvider>
      <CartPageContent
        catalog={CATALOG}
        pricingDisclaimer="Disclaimer."
        deliveryEstimate="Estimate."
      />
    </CartProvider>
  );
}

const submitButton = () => screen.getByRole("button", { name: "Submit Order Request" });
const lineFor = (label: RegExp) => screen.getByLabelText(label).closest("li") as HTMLElement;

describe("cart page", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows one line per color with its color, swatch label, photo and links", () => {
    renderCart([
      { productId: "vest", color: "Navy", quantity: 6 },
      { productId: "vest", color: "Black", quantity: 6 },
    ]);

    const navy = lineFor(/Quantity for Test Vest, Navy/);
    const black = lineFor(/Quantity for Test Vest, Black/);
    expect(within(navy).getByText("Navy")).toBeInTheDocument();
    expect(within(black).getByText("Black")).toBeInTheDocument();

    // Navy has its own photo; Black falls back to the product photo.
    expect(navy.querySelector("img")!.getAttribute("src")).toContain(
      encodeURIComponent("/images/merch/vest-navy.webp")
    );
    expect(black.querySelector("img")!.getAttribute("src")).toContain(
      encodeURIComponent("/images/merch/vest.webp")
    );

    // Product name links back to the product with ?color=.
    expect(within(navy).getByRole("link", { name: "Test Vest" })).toHaveAttribute(
      "href",
      "/merchandise/vest?color=Navy"
    );
    expect(within(black).getByRole("link", { name: "Test Vest" })).toHaveAttribute(
      "href",
      "/merchandise/vest?color=Black"
    );
  });

  it("prices every color of a product at the shared tier and says so", () => {
    renderCart([
      { productId: "vest", color: "Navy", quantity: 6 },
      { productId: "vest", color: "Black", quantity: 6 },
    ]);
    // 6 + 6 = 12 units -> the 12+ price of $90.00 on both lines.
    for (const label of [/Quantity for Test Vest, Navy/, /Quantity for Test Vest, Black/]) {
      const line = lineFor(label);
      expect(within(line).getByText("$90.00 per unit")).toBeInTheDocument();
      expect(within(line).getByText("$540.00")).toBeInTheDocument();
    }
    expect(screen.getByText("Volume pricing applies across colors.")).toBeInTheDocument();
    expect(screen.getByText("$1,080.00")).toBeInTheDocument();
  });

  it("omits the cross-color note for a product with a single line", () => {
    renderCart([{ productId: "vest", color: "Navy", quantity: 6 }]);
    expect(screen.queryByText("Volume pricing applies across colors.")).not.toBeInTheDocument();
  });

  it("re-prices both lines when one quantity changes, and removes one line at a time", () => {
    renderCart([
      { productId: "vest", color: "Navy", quantity: 6 },
      { productId: "vest", color: "Black", quantity: 6 },
    ]);
    fireEvent.change(screen.getByLabelText("Quantity for Test Vest, Navy"), {
      target: { value: "2" },
    });
    // 2 + 6 = 8 units: back to the 6+ price.
    expect(
      within(lineFor(/Quantity for Test Vest, Black/)).getByText("$100.00 per unit")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove Test Vest, Navy" }));
    expect(screen.queryByLabelText("Quantity for Test Vest, Navy")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Test Vest, Black")).toHaveValue(6);
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([
      { productId: "vest", color: "Black", quantity: 6 },
    ]);
  });

  it("warns when a product's total is under its minimum and blocks submit", () => {
    renderCart([
      { productId: "vest", color: "Navy", quantity: 2 },
      { productId: "vest", color: "Black", quantity: 3 },
    ]);
    expect(screen.getByText(/Minimum order is 6 units/)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    // Raising the total across colors to the minimum clears it.
    fireEvent.change(screen.getByLabelText("Quantity for Test Vest, Black"), {
      target: { value: "4" },
    });
    expect(screen.queryByText(/Minimum order is/)).not.toBeInTheDocument();
    expect(submitButton()).not.toBeDisabled();
  });

  it("asks legacy colorless lines for a color and blocks submit until chosen", () => {
    renderCart([
      { productId: "vest", quantity: 6 },
      { productId: "mug", quantity: 10 },
    ]);

    const select = screen.getByLabelText("Choose a color") as HTMLSelectElement;
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent)
    ).toEqual(["Select a color", "Black", "Navy"]);
    // Only the colored product asks; the mug has no colors.
    expect(screen.getAllByLabelText("Choose a color")).toHaveLength(1);
    expect(submitButton()).toBeDisabled();

    fireEvent.change(select, { target: { value: "Navy" } });
    expect(screen.queryByLabelText("Choose a color")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Test Vest, Navy")).toHaveValue(6);
    expect(submitButton()).not.toBeDisabled();
  });

  it("merges a legacy line into an existing line of the color the shopper chooses", () => {
    renderCart([
      { productId: "vest", quantity: 6 },
      { productId: "vest", color: "Black", quantity: 6 },
    ]);
    fireEvent.change(screen.getByLabelText("Choose a color"), { target: { value: "Black" } });
    expect(screen.getAllByLabelText(/Quantity for Test Vest/)).toHaveLength(1);
    expect(screen.getByLabelText("Quantity for Test Vest, Black")).toHaveValue(12);
  });

  it("treats a saved color the product no longer offers like a legacy line", () => {
    renderCart([{ productId: "vest", color: "Chartreuse", quantity: 6 }]);
    expect(screen.getByLabelText("Choose a color")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("shows an empty cart for corrupt storage without crashing", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{oops");
    render(
      <CartProvider>
        <CartPageContent catalog={CATALOG} pricingDisclaimer="D" deliveryEstimate="E" />
      </CartProvider>
    );
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
  });

  it("submits each line's color to the checkout API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    renderCart([
      { productId: "vest", color: "Navy", quantity: 6 },
      { productId: "vest", color: "Black", quantity: 6 },
      { productId: "mug", quantity: 10 },
    ]);
    fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Pat" } });
    fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Lee" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "pat@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "5555551234" } });
    fireEvent.click(submitButton());

    expect(await screen.findByText("Order Request Received")).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.items).toEqual([
      { productId: "vest", color: "Navy", quantity: 6 },
      { productId: "vest", color: "Black", quantity: 6 },
      { productId: "mug", quantity: 10 },
    ]);
    vi.unstubAllGlobals();
  });
  it("shows the order reference after a successful submit, and says whether we emailed it", async () => {
    for (const [emailed, expected] of [
      [true, /We've emailed you a confirmation/],
      [false, /Keep it handy/],
    ] as const) {
      window.localStorage.clear();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, orderRef: "MG-00042", confirmationEmailed: emailed }),
      });
      vi.stubGlobal("fetch", fetchMock);
      const { unmount } = renderCart([{ productId: "mug", quantity: 10 }]);
      fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Pat" } });
      fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Lee" } });
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "pat@example.com" } });
      fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "5555551234" } });
      fireEvent.click(submitButton());

      expect(await screen.findByText("MG-00042")).toBeInTheDocument();
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
      vi.unstubAllGlobals();
    }
  });
});
