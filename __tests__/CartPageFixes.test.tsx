import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CART_STORAGE_KEY, CartProvider } from "@/components/merchandise/CartContext";
import CartLink from "@/components/merchandise/CartLink";
import CartPageContent from "@/components/merchandise/CartPageContent";
import { CART_FORM_MESSAGES } from "@/lib/cartFormRules";
import type { CatalogProduct } from "@/lib/merchCatalog";

vi.mock("@/components/Turnstile", () => ({ default: () => null }));

const base = {
  category: "Apparel",
  brand: "Essentials",
  description: "",
  image: "/images/merch/x.webp",
  imprintArea: { top: 40, left: 50, width: 20 },
};
const VEST: CatalogProduct = {
  ...base,
  id: "vest",
  name: "Test Vest",
  colors: ["Black", "Navy"],
  tiers: [
    { quantity: 6, price: 100 },
    { quantity: 12, price: 90 },
  ],
};
const MUG: CatalogProduct = {
  ...base,
  id: "mug",
  name: "Test Mug",
  tiers: [
    { quantity: 1, price: 5 },
    { quantity: 50, price: 4 },
  ],
};
const ORGANIZER: CatalogProduct = {
  ...base,
  id: "organizer",
  name: "Bamboo Organizer",
  colors: ["Natural"],
  tiers: [{ quantity: 10, price: 8 }],
};
const CATALOG = [VEST, MUG, ORGANIZER];

function renderCart(stored: unknown, availableProductIds?: string[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stored));
  return render(
    <CartProvider availableProductIds={availableProductIds}>
      <CartLink />
      <CartPageContent catalog={CATALOG} pricingDisclaimer="D." deliveryEstimate="E." />
    </CartProvider>
  );
}

const stored = () => JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "null");
const submitButton = () => screen.getByRole("button", { name: "Submit Order Request" });

function fill(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    "First Name": "Pat",
    "Last Name": "Lee",
    Email: "pat@example.com",
    Phone: "5555551234",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

describe("cart form validation", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("rejects a 3-digit phone on the client with the server's rule, and focuses it", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderCart([{ productId: "mug", quantity: 10 }]);
    fill({ Phone: "123" });
    fireEvent.click(submitButton());

    expect(screen.getByText(CART_FORM_MESSAGES.phoneTooShort)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Phone")).toHaveFocus();
    expect(screen.getByLabelText("Phone")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Phone")).toHaveAccessibleDescription(
      CART_FORM_MESSAGES.phoneTooShort
    );
  });

  it("moves focus to the first invalid field in form order", () => {
    renderCart([{ productId: "mug", quantity: 10 }]);
    fill({ "Last Name": "", Email: "nope", Phone: "1" });
    fireEvent.click(submitButton());
    expect(screen.getByLabelText("Last Name")).toHaveFocus();

    fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Lee" } });
    fireEvent.click(submitButton());
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("shows the server's per-field errors instead of 'Validation failed.'", async () => {
    // A server that disagrees with the client (here it also wants a longer phone).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: "Validation failed.",
          issues: {
            formErrors: [],
            fieldErrors: { phone: ["Enter a phone number with at least 7 characters."] },
          },
        }),
      })
    );
    renderCart([{ productId: "mug", quantity: 10 }]);
    fill();
    fireEvent.click(submitButton());

    expect(
      await screen.findByText("Please fix the highlighted fields and submit again.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Validation failed.")).not.toBeInTheDocument();
    expect(
      screen.getByText("Enter a phone number with at least 7 characters.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(screen.getByLabelText("Phone")).toHaveFocus());
  });

  it("shows a server message about the items list in the banner and focuses it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: "Validation failed.",
          issues: { formErrors: [], fieldErrors: { items: [CART_FORM_MESSAGES.quantityMax] } },
        }),
      })
    );
    renderCart([{ productId: "mug", quantity: 10 }]);
    fill();
    fireEvent.click(submitButton());

    const banner = await screen.findByText(CART_FORM_MESSAGES.quantityMax);
    expect(banner).toHaveAttribute("role", "alert");
    await waitFor(() => expect(banner).toHaveFocus());
  });
});

describe("cart quantity inputs", () => {
  beforeEach(() => window.localStorage.clear());

  it("caps at the server limit with an inline message", () => {
    renderCart([{ productId: "mug", quantity: 10 }]);
    const input = screen.getByLabelText("Quantity for Test Mug");
    expect(input).toHaveAttribute("max", "100000");
    fireEvent.change(input, { target: { value: "9999999" } });

    expect(input).toHaveValue(100000);
    expect(screen.getByText(CART_FORM_MESSAGES.quantityMax)).toBeInTheDocument();
    expect(stored()).toEqual([{ productId: "mug", quantity: 100000 }]);
    expect(screen.getByText(/100000 units/)).toBeInTheDocument();
  });

  it("lets the box be empty while retyping instead of snapping to 1", () => {
    renderCart([{ productId: "mug", quantity: 100 }]);
    const input = screen.getByLabelText("Quantity for Test Mug");
    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveValue(null);
    // Nothing was committed while empty.
    expect(stored()).toEqual([{ productId: "mug", quantity: 100 }]);

    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.change(input, { target: { value: "15" } });
    expect(input).toHaveValue(15);
    expect(stored()).toEqual([{ productId: "mug", quantity: 15 }]);
  });

  it("puts the last good quantity back on blur or Enter when left empty", () => {
    renderCart([{ productId: "mug", quantity: 40 }]);
    const input = screen.getByLabelText("Quantity for Test Mug");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(40);

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue(40);
    expect(stored()).toEqual([{ productId: "mug", quantity: 40 }]);
  });

  it("follows the cart when the quantity changes from elsewhere (a merged line)", () => {
    renderCart([
      { productId: "vest", quantity: 6 },
      { productId: "vest", color: "Black", quantity: 6 },
    ]);
    fireEvent.change(screen.getByLabelText("Choose a color"), { target: { value: "Black" } });
    expect(screen.getByLabelText("Quantity for Test Vest, Black")).toHaveValue(12);
  });
});

describe("legacy lines of single-color products", () => {
  beforeEach(() => window.localStorage.clear());

  it("auto-selects the only color instead of asking, and saves it", async () => {
    renderCart([{ productId: "organizer", quantity: 80 }]);

    expect(screen.queryByLabelText("Choose a color")).not.toBeInTheDocument();
    expect(screen.getByText("Natural")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Bamboo Organizer, Natural")).toHaveValue(80);
    expect(submitButton()).not.toBeDisabled();
    await waitFor(() =>
      expect(stored()).toEqual([{ productId: "organizer", color: "Natural", quantity: 80 }])
    );
  });

  it("submits the auto-selected color", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    renderCart([{ productId: "organizer", quantity: 80 }]);
    fill();
    fireEvent.click(submitButton());
    expect(await screen.findByText("Order Request Received")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).items).toEqual([
      { productId: "organizer", color: "Natural", quantity: 80 },
    ]);
    vi.unstubAllGlobals();
  });

  it("merges into an existing line of that same color", async () => {
    renderCart([
      { productId: "organizer", quantity: 10 },
      { productId: "organizer", color: "Natural", quantity: 20 },
    ]);
    await waitFor(() =>
      expect(stored()).toEqual([{ productId: "organizer", color: "Natural", quantity: 30 }])
    );
  });

  it("still asks when the product has several colors", () => {
    renderCart([{ productId: "vest", quantity: 6 }]);
    expect(screen.getByLabelText("Choose a color")).toBeInTheDocument();
  });
});

describe("lines for products that are gone", () => {
  beforeEach(() => window.localStorage.clear());

  it("removes them from storage and the header count and says so", async () => {
    renderCart(
      [
        { productId: "bogus-product", quantity: 5000 },
        { productId: "mug", quantity: 10 },
      ],
      ["vest", "mug", "organizer"]
    );

    expect(
      screen.getByText("An item in your cart is no longer available and was removed.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cart (1)" })).toBeInTheDocument();
    await waitFor(() => expect(stored()).toEqual([{ productId: "mug", quantity: 10 }]));
  });

  it("pluralizes when several were removed, and shows nothing when none were", () => {
    const { unmount } = renderCart(
      [
        { productId: "gone-a", quantity: 5 },
        { productId: "gone-b", quantity: 5 },
      ],
      ["mug"]
    );
    expect(
      screen.getByText("2 items in your cart are no longer available and were removed.")
    ).toBeInTheDocument();
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
    unmount();

    window.localStorage.clear();
    renderCart([{ productId: "mug", quantity: 10 }], ["mug"]);
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();
  });

  it("keeps everything when the provider is not told which products exist", () => {
    renderCart([{ productId: "bogus-product", quantity: 5 }]);
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();
    expect(stored()).toEqual([{ productId: "bogus-product", quantity: 5 }]);
  });
});

describe("header cart badge", () => {
  beforeEach(() => window.localStorage.clear());

  it("counts distinct lines, not units", () => {
    renderCart([
      { productId: "vest", color: "Black", quantity: 5000 },
      { productId: "vest", color: "Navy", quantity: 100 },
      { productId: "mug", quantity: 10 },
    ]);
    expect(screen.getByRole("link", { name: "Cart (3)" })).toBeInTheDocument();
  });

  it("shows no count for an empty cart", () => {
    renderCart([]);
    expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument();
  });
});
