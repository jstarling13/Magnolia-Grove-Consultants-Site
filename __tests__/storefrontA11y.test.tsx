import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CartAnnouncer from "@/components/merchandise/CartAnnouncer";
import { CartProvider, useCart } from "@/components/merchandise/CartContext";
import CartLink from "@/components/merchandise/CartLink";
import MerchRequestForm from "@/components/merchandise/RequestForm";
import Header from "@/components/global/Header";

vi.mock("@/components/Turnstile", () => ({ default: () => null }));

let pathname = "/merchandise";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function Controls() {
  const cart = useCart();
  return (
    <>
      <button onClick={() => cart.addItem("vest", 6, "Navy")}>add vest</button>
      <button onClick={() => cart.addItem("tee", 12, "Black")}>add tee</button>
      <button onClick={() => cart.updateQuantity("vest", 9, "Navy")}>edit vest</button>
      <button onClick={() => cart.removeItem("vest", "Navy")}>remove vest</button>
    </>
  );
}

function renderStore() {
  return render(
    <CartProvider>
      <CartAnnouncer />
      <CartLink />
      <Controls />
    </CartProvider>
  );
}

describe("CartAnnouncer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pathname = "/merchandise";
  });

  it("is a polite live region that is empty until the cart changes", async () => {
    renderStore();
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
  });

  it("says what was added, with the cart totals", async () => {
    renderStore();
    fireEvent.click(screen.getByText("add vest"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Added to cart. Your cart has 1 item, 6 units."
      )
    );
    fireEvent.click(screen.getByText("add tee"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Added to cart. Your cart has 2 items, 18 units."
      )
    );
  });

  it("says what was removed, including when the cart is now empty", async () => {
    renderStore();
    fireEvent.click(screen.getByText("add vest"));
    fireEvent.click(screen.getByText("remove vest"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Removed from cart. Your cart is empty.")
    );
  });

  it("stays quiet on the cart page when a quantity is edited", async () => {
    renderStore();
    fireEvent.click(screen.getByText("add vest"));
    pathname = "/merchandise/cart";
    await act(async () => {});
    const before = screen.getByRole("status").textContent;
    fireEvent.click(screen.getByText("edit vest"));
    expect(screen.getByRole("status").textContent).toBe(before);
  });

  it("does not announce the saved cart loading from storage", async () => {
    window.localStorage.setItem(
      "mg-merch-cart",
      JSON.stringify([{ productId: "vest", color: "Navy", quantity: 6 }])
    );
    renderStore();
    await waitFor(() => expect(screen.getByRole("link", { name: "Cart (1)" })).toBeInTheDocument());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

describe("CartLink", () => {
  it("is at least 44px tall and has a visible focus ring", () => {
    render(
      <CartProvider>
        <CartLink />
      </CartProvider>
    );
    const link = screen.getByRole("link", { name: /^Cart/ });
    expect(link.className).toContain("min-h-11");
    expect(link.className).toContain("focus-visible:outline-gold-bright");
  });
});

describe("Header", () => {
  it("has a skip link that moves focus to <main>", () => {
    render(
      <>
        <Header />
        <main>content</main>
      </>
    );
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    // First in the document, so it is the first Tab stop.
    expect(document.body.querySelector("a")).toBe(skip);
    fireEvent.click(skip);
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("labels its landmarks and the icon-only controls, and marks the current page", () => {
    pathname = "/merchandise/cart";
    render(<Header />);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Log In" }).length).toBeGreaterThan(0);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle).toHaveAttribute("aria-controls", "mobile-menu");
    expect(toggle.className).toContain("h-11");
    expect(toggle.className).toContain("w-11");
    const current = screen
      .getAllByRole("link", { name: "Merchant" })
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.length).toBeGreaterThan(0);
  });
});

describe("MerchRequestForm", () => {
  it("ties each error to its field, announces it, and focuses the first invalid field", async () => {
    render(<MerchRequestForm />);
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    const first = screen.getByLabelText("First Name");
    expect(first).toHaveFocus();
    expect(first).toBeInvalid();
    expect(first).toBeRequired();
    const error = screen.getByText("First name is required.");
    expect(error).toHaveAttribute("role", "alert");
    expect(first).toHaveAttribute("aria-describedby", error.id);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", "email-error");
  });

  it("announces submission and moves focus to the confirmation on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    );
    render(<MerchRequestForm />);
    const type = (label: string, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    type("First Name", "Ada");
    type("Last Name", "Lovelace");
    type("Email", "ada@example.com");
    type("Phone", "5551234567");
    type("What Product Are You Looking For?", "Quarter-zips");
    type("Estimated Quantity", "50");
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    const heading = await screen.findByRole("heading", { name: "Request Received" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading.closest('[role="status"]')).not.toBeNull();
    vi.unstubAllGlobals();
  });

  it("shows a failed submission in an alert that takes focus", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Server said no." }) })
    );
    render(<MerchRequestForm />);
    const type = (label: string, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    type("First Name", "Ada");
    type("Last Name", "Lovelace");
    type("Email", "ada@example.com");
    type("Phone", "5551234567");
    type("What Product Are You Looking For?", "Quarter-zips");
    type("Estimated Quantity", "50");
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    const alert = await screen.findByText("Server said no.");
    expect(alert).toHaveAttribute("role", "alert");
    await waitFor(() => expect(alert).toHaveFocus());
    vi.unstubAllGlobals();
  });
});
