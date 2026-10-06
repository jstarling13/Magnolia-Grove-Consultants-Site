import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CART_STORAGE_KEY, CartProvider } from "@/components/merchandise/CartContext";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import ProductDetailActions from "@/components/merchandise/ProductDetailActions";
import { ProductSelectionProvider } from "@/components/merchandise/ProductSelectionContext";
import { CART_FORM_MESSAGES } from "@/lib/cartFormRules";
import type { CatalogProduct } from "@/lib/merchCatalog";

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "tee",
    name: "Test Tee",
    category: "Apparel",
    brand: "Essentials",
    description: "",
    image: "/images/merch/tee.webp",
    colors: ["Black"],
    tiers: [
      { quantity: 72, price: 10 },
      { quantity: 144, price: 9 },
    ],
    imprintArea: { top: 40, left: 50, width: 20 },
    ...overrides,
  };
}

function renderActions(p: CatalogProduct) {
  return render(
    <LogoProvider>
      <CartProvider>
        <ProductSelectionProvider product={p}>
          <ProductDetailActions product={p} />
        </ProductSelectionProvider>
      </CartProvider>
    </LogoProvider>
  );
}

const quantity = () => screen.getByLabelText("Quantity") as HTMLInputElement;
const addToCart = () => screen.getByRole("button", { name: "Add to Cart" });
/** What typing does in a browser: an input event the user typed (inputType "insertText"). */
function typeQuantity(value: string) {
  fireEvent.input(quantity(), { target: { value }, inputType: "insertText" });
}
const storedCart = () => JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]");

describe("product page minimum order", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/merchandise/tee");
  });

  it("sets min on the input and shows the minimum beside it in readable text", () => {
    renderActions(product());
    expect(quantity()).toHaveAttribute("min", "72");
    const note = screen.getByText("Minimum order: 72 units");
    // Not the faded /50 or /60 greys flagged for contrast.
    expect(note.className).not.toMatch(/onyx\/(50|60)/);
    expect(quantity()).toHaveAttribute("aria-describedby", note.id);
  });

  it("refuses an add below the minimum, explains why, and does not say 'Added'", () => {
    renderActions(product());
    fireEvent.change(quantity(), { target: { value: "5" } });
    fireEvent.click(addToCart());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The minimum order is 72 units. Enter 72 or more."
    );
    expect(screen.queryByText(/Added to cart/)).not.toBeInTheDocument();
    expect(storedCart()).toEqual([]);
    expect(quantity()).toHaveFocus();
    expect(quantity()).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the explanation once a valid quantity is entered and adds it", () => {
    renderActions(product());
    fireEvent.change(quantity(), { target: { value: "5" } });
    fireEvent.click(addToCart());
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.change(quantity(), { target: { value: "72" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(addToCart());
    expect(storedCart()).toEqual([{ productId: "tee", color: "Black", quantity: 72 }]);
    expect(screen.getByRole("status")).toHaveTextContent("Added to cart: Black x 72");
  });

  it("counts units already in the cart toward the minimum", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ productId: "tee", color: "Black", quantity: 70 }])
    );
    renderActions(product());
    expect(quantity()).toHaveAttribute("min", "2");

    fireEvent.change(quantity(), { target: { value: "1" } });
    fireEvent.click(addToCart());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "you already have 70 in your cart. Enter 2 or more."
    );

    fireEvent.change(quantity(), { target: { value: "2" } });
    fireEvent.click(addToCart());
    expect(storedCart()).toEqual([{ productId: "tee", color: "Black", quantity: 72 }]);
  });

  it("refuses an add while the box is empty instead of adding the old number", () => {
    renderActions(product());
    fireEvent.change(quantity(), { target: { value: "" } });
    expect(quantity().value).toBe("");
    fireEvent.click(addToCart());
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a quantity of 72 or more.");
    expect(storedCart()).toEqual([]);
  });
});

describe("product page quantity box", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/merchandise/tee");
  });

  it("allows an empty draft while typing and restores the last good number on blur", () => {
    renderActions(product({ tiers: [{ quantity: 1, price: 5 }] }));
    fireEvent.change(quantity(), { target: { value: "100" } });
    fireEvent.change(quantity(), { target: { value: "" } });
    expect(quantity().value).toBe("");
    // Retyping gives 15, not 115 or 1 + 5.
    fireEvent.change(quantity(), { target: { value: "1" } });
    fireEvent.change(quantity(), { target: { value: "15" } });
    expect(quantity().value).toBe("15");
    expect(screen.getByText("$75.00")).toBeInTheDocument();

    fireEvent.change(quantity(), { target: { value: "" } });
    fireEvent.blur(quantity());
    expect(quantity().value).toBe("15");
  });

  it("caps at the server limit with an inline message", () => {
    renderActions(product({ tiers: [{ quantity: 1, price: 5 }] }));
    expect(quantity()).toHaveAttribute("max", "100000");
    fireEvent.change(quantity(), { target: { value: "9999999" } });
    expect(quantity().value).toBe("100000");
    expect(screen.getByRole("alert")).toHaveTextContent(CART_FORM_MESSAGES.quantityMax);
  });
});

describe("single-tier product", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/merchandise/tee");
  });

  it("says '/ unit' without a fake 'N+' break and no best-price line", () => {
    renderActions(product({ tiers: [{ quantity: 1, price: 58.82 }] }));
    expect(screen.getByText("$58.82 / unit")).toBeInTheDocument();
    expect(screen.queryByText(/\/ unit at/)).not.toBeInTheDocument();
    expect(screen.queryByText(/best price/)).not.toBeInTheDocument();
    // A minimum of 1 needs no callout.
    expect(screen.queryByText(/Minimum order/)).not.toBeInTheDocument();
  });

  it("keeps the 'N+' wording when there really are several tiers", () => {
    renderActions(product());
    expect(screen.getByText("$10.00 / unit at 72+")).toBeInTheDocument();
  });
});

describe("product page quantity commits on blur, not per keystroke", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/merchandise/tee");
  });

  it("keeps prices stable while 144 is typed, then re-prices on blur", () => {
    renderActions(
      product({
        tiers: [
          { quantity: 1, price: 12 },
          { quantity: 144, price: 9 },
        ],
      })
    );
    expect(screen.getByText("$12.00 / unit at 1+")).toBeInTheDocument();

    typeQuantity("1");
    typeQuantity("14");
    expect(quantity().value).toBe("14");
    // Still the committed 1-unit price: no flash through tiers while typing.
    expect(screen.getByText("$12.00 / unit at 1+")).toBeInTheDocument();
    expect(screen.getByText("$12.00")).toBeInTheDocument();

    typeQuantity("144");
    expect(quantity().value).toBe("144");
    expect(screen.getByText("$12.00 / unit at 1+")).toBeInTheDocument();

    fireEvent.blur(quantity());
    expect(screen.getByText("$9.00 / unit at 144+")).toBeInTheDocument();
    expect(screen.getByText("$1,296.00")).toBeInTheDocument();
  });

  it("commits on Enter", () => {
    renderActions(
      product({
        tiers: [
          { quantity: 1, price: 12 },
          { quantity: 144, price: 9 },
        ],
      })
    );
    typeQuantity("144");
    fireEvent.keyDown(quantity(), { key: "Enter" });
    expect(screen.getByText("$9.00 / unit at 144+")).toBeInTheDocument();
  });

  it("commits a stepper step immediately (the arrows send no inputType)", () => {
    renderActions(
      product({
        tiers: [
          { quantity: 1, price: 12 },
          { quantity: 144, price: 9 },
        ],
      })
    );
    fireEvent.change(quantity(), { target: { value: "144" } });
    expect(screen.getByText("$9.00 / unit at 144+")).toBeInTheDocument();
  });

  it("restores the last good quantity when the box is left empty or unusable", () => {
    renderActions(product());
    typeQuantity("");
    expect(quantity().value).toBe("");
    fireEvent.blur(quantity());
    expect(quantity().value).toBe("72");
    expect(screen.getByText("$720.00")).toBeInTheDocument();

    typeQuantity("1e2");
    fireEvent.blur(quantity());
    expect(quantity().value).toBe("72");
  });

  it("never commits below the minimum: the number stays, with a message, and the price holds", () => {
    renderActions(product());
    typeQuantity("5");
    fireEvent.blur(quantity());
    expect(quantity().value).toBe("5");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The minimum order is 72 units. Enter 72 or more."
    );
    expect(screen.getByText("$720.00")).toBeInTheDocument();
    expect(storedCart()).toEqual([]);
  });

  it("adds the number in the box even when Add is clicked before the box blurs", () => {
    renderActions(product());
    typeQuantity("144");
    fireEvent.click(addToCart());
    expect(storedCart()).toEqual([{ productId: "tee", color: "Black", quantity: 144 }]);
    expect(screen.getByRole("status")).toHaveTextContent("Added to cart: Black x 144");
  });

  it("clamps an over-limit number as it is typed but commits it on blur", () => {
    renderActions(product({ tiers: [{ quantity: 1, price: 5 }] }));
    typeQuantity("9999999");
    expect(quantity().value).toBe("100000");
    expect(screen.getByRole("alert")).toHaveTextContent(CART_FORM_MESSAGES.quantityMax);
    expect(screen.getByText("$5.00 / unit")).toBeInTheDocument();
    fireEvent.blur(quantity());
    expect(screen.getByText("$500,000.00")).toBeInTheDocument();
  });
});
