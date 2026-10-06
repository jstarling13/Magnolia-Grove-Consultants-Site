import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CART_STORAGE_KEY,
  CartProvider,
  addLine,
  parseStoredCart,
  recolorLine,
  setLineDetails,
  type CartLineItem,
} from "@/components/merchandise/CartContext";
import CartPageContent from "@/components/merchandise/CartPageContent";
import OrderDetail from "@/components/admin/orders/OrderDetail";
import { readOrderItems, type OrderRecord } from "@/lib/adminOrders";
import { categoryTakesSizes, cleanLineDetail } from "@/lib/cartFormRules";
import { cartSendFailureMessage, shopperErrorMessage } from "@/lib/cartShopperMessages";
import { buildMerchRequestConfirmationEmail } from "@/lib/email";
import { buildBackendOrderSheet } from "@/lib/merchBackendSheet";
import type { CatalogProduct } from "@/lib/merchCatalog";

vi.mock("@/components/Turnstile", () => ({ default: () => null }));
vi.mock("@/app/admin/actions", () => ({
  markSubmissionRead: vi.fn(),
  addDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
  updateMerchOrderStatus: vi.fn(),
  sendMerchPaymentLink: vi.fn(),
  recordEspOrder: vi.fn(),
  markMerchShipped: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  redirect: vi.fn(),
}));

const POLO: CatalogProduct = {
  id: "polo",
  name: "Test Polo",
  category: "Apparel",
  brand: "Essentials",
  description: "",
  image: "/images/merch/x.webp",
  imprintArea: { top: 40, left: 50, width: 20 },
  colors: ["Navy", "Black"],
  tiers: [{ quantity: 6, price: 20 }],
};
const MUG: CatalogProduct = {
  ...POLO,
  id: "mug",
  name: "Test Mug",
  category: "Drinkware",
  colors: undefined,
  tiers: [{ quantity: 10, price: 5 }],
};

const stored = () => JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "null");

function renderCart(saved: unknown) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(saved));
  return render(
    <CartProvider>
      <CartPageContent catalog={[POLO, MUG]} pricingDisclaimer="D." deliveryEstimate="E." />
    </CartProvider>
  );
}

function fillContact() {
  const values = {
    "First Name": "Pat",
    "Last Name": "Lee",
    Email: "pat@example.com",
    Phone: "5555551234",
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

describe("shared line-detail rules", () => {
  it("offers sizes for apparel and headwear only", () => {
    expect(categoryTakesSizes("Apparel")).toBe(true);
    expect(categoryTakesSizes("Headwear")).toBe(true);
    expect(categoryTakesSizes("Drinkware")).toBe(false);
    expect(categoryTakesSizes(undefined)).toBe(false);
  });

  it("cleans free text: trims, drops blanks and non-text, cuts at 300", () => {
    expect(cleanLineDetail("  24 M, 60 L ")).toBe("24 M, 60 L");
    expect(cleanLineDetail("   ")).toBeUndefined();
    expect(cleanLineDetail(5)).toBeUndefined();
    expect(cleanLineDetail(null)).toBeUndefined();
    expect(cleanLineDetail("x".repeat(500))).toHaveLength(300);
  });
});

describe("saved cart back-compatibility", () => {
  it("reads a cart saved before sizes and notes existed exactly as before", () => {
    const old = [
      { productId: "polo", color: "Navy", quantity: 6 },
      { productId: "mug", quantity: 10 },
    ];
    expect(parseStoredCart(JSON.stringify(old))).toEqual(old);
  });

  it("keeps sizes and imprint notes, and drops anything that is not text", () => {
    const cart = parseStoredCart(
      JSON.stringify([
        {
          productId: "polo",
          color: "Navy",
          quantity: 6,
          sizes: " 2 M, 4 L ",
          imprintNotes: "Back",
        },
        { productId: "mug", quantity: 10, sizes: 12, imprintNotes: { a: 1 } },
        { productId: "polo", color: "Black", quantity: 6, sizes: "x".repeat(900) },
      ])
    );
    expect(cart[0]).toEqual({
      productId: "polo",
      color: "Navy",
      quantity: 6,
      sizes: "2 M, 4 L",
      imprintNotes: "Back",
    });
    expect(cart[1]).toEqual({ productId: "mug", quantity: 10 });
    expect(cart[2].sizes).toHaveLength(300);
  });

  it("keeps the first line's text when duplicate lines are folded together", () => {
    const cart = parseStoredCart(
      JSON.stringify([
        { productId: "polo", color: "Navy", quantity: 6 },
        { productId: "polo", color: "Navy", quantity: 6, sizes: "6 L" },
      ])
    );
    expect(cart).toEqual([{ productId: "polo", color: "Navy", quantity: 12, sizes: "6 L" }]);
  });

  it("never throws on a damaged cart", () => {
    expect(parseStoredCart("{not json")).toEqual([]);
    expect(parseStoredCart(JSON.stringify([null, 4, "x", { productId: 3 }]))).toEqual([]);
  });

  it("setLineDetails edits one line, keeps spaces while typing, and clears blanks", () => {
    const base: CartLineItem[] = [
      { productId: "polo", color: "Navy", quantity: 6 },
      { productId: "polo", color: "Black", quantity: 6 },
    ];
    const typed = setLineDetails(base, "polo", "Navy", { sizes: "24 M, " });
    expect(typed[0].sizes).toBe("24 M, ");
    expect(typed[1]).toEqual(base[1]);
    const both = setLineDetails(typed, "polo", "Navy", { imprintNotes: "Back" });
    expect(both[0]).toMatchObject({ sizes: "24 M, ", imprintNotes: "Back" });
    const cleared = setLineDetails(both, "polo", "Navy", { sizes: "   " });
    expect(cleared[0]).toEqual({
      productId: "polo",
      color: "Navy",
      quantity: 6,
      imprintNotes: "Back",
    });
  });

  it("adding more of a line keeps its text, and re-coloring carries it along", () => {
    const withText = setLineDetails(
      [{ productId: "polo", color: "Navy", quantity: 6 }],
      "polo",
      "Navy",
      { sizes: "6 L" }
    );
    expect(addLine(withText, "polo", 6, "Navy")[0]).toMatchObject({ quantity: 12, sizes: "6 L" });
    expect(recolorLine(withText, "polo", "Navy", "Black")[0]).toEqual({
      productId: "polo",
      color: "Black",
      quantity: 6,
      sizes: "6 L",
    });
    const merged = recolorLine(
      [...withText, { productId: "polo", color: "Black", quantity: 6, imprintNotes: "Back" }],
      "polo",
      "Navy",
      "Black"
    );
    expect(merged).toEqual([
      { productId: "polo", color: "Black", quantity: 12, imprintNotes: "Back", sizes: "6 L" },
    ]);
  });
});

describe("cart page: sizes, imprint notes, artwork", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("offers sizes and imprint notes on apparel, but only imprint notes on other products", () => {
    renderCart([
      { productId: "polo", color: "Navy", quantity: 6 },
      { productId: "mug", quantity: 10 },
    ]);
    const apparel = screen.getByRole("button", { name: /Add sizes or imprint notes/ });
    const other = screen.getByRole("button", { name: /Add imprint notes/ });
    expect(apparel).toHaveAttribute("aria-expanded", "false");
    expect(other).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(apparel);
    expect(apparel).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/Sizes and quantities/)).toHaveAttribute(
      "placeholder",
      "24 M, 60 L, 60 XL"
    );
    // Collapsed panels are hidden, so only the opened one is reachable.
    expect(screen.getAllByRole("textbox", { name: /Imprint notes/ })).toHaveLength(1);

    fireEvent.click(other);
    expect(screen.getAllByRole("textbox", { name: /Imprint notes/ })).toHaveLength(2);
    expect(screen.getAllByRole("textbox", { name: /Sizes and quantities/ })).toHaveLength(1);
  });

  it("saves what the shopper types into the stored cart and reopens with it", () => {
    const { unmount } = renderCart([{ productId: "polo", color: "Navy", quantity: 6 }]);
    fireEvent.click(screen.getByRole("button", { name: /Add sizes or imprint notes/ }));
    fireEvent.change(screen.getByLabelText(/Sizes and quantities/), {
      target: { value: "2 M, 4 L" },
    });
    fireEvent.change(screen.getByLabelText(/Imprint notes/), {
      target: { value: "Left chest, white ink" },
    });
    expect(stored()).toEqual([
      {
        productId: "polo",
        color: "Navy",
        quantity: 6,
        sizes: "2 M, 4 L",
        imprintNotes: "Left chest, white ink",
      },
    ]);
    unmount();

    render(
      <CartProvider>
        <CartPageContent catalog={[POLO, MUG]} pricingDisclaimer="D." deliveryEstimate="E." />
      </CartProvider>
    );
    // A line that already has text opens expanded.
    expect(screen.getByLabelText(/Sizes and quantities/)).toHaveValue("2 M, 4 L");
    expect(screen.getByLabelText(/Imprint notes/)).toHaveValue("Left chest, white ink");
  });

  it("sends the text with the submitted line and omits it when empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, orderRef: "MG-00007", confirmationEmailed: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCart([
      { productId: "polo", color: "Navy", quantity: 6, sizes: " 2 M, 4 L ", imprintNotes: "Back" },
      { productId: "mug", quantity: 10 },
    ]);
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Submit Order Request" }));
    await screen.findByText("Order Request Received");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.items).toEqual([
      { productId: "polo", color: "Navy", quantity: 6, sizes: "2 M, 4 L", imprintNotes: "Back" },
      { productId: "mug", quantity: 10 },
    ]);
  });

  it("says how the logo and quote work before submitting and after, matching the order flow", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, orderRef: "MG-00007", confirmationEmailed: true }),
      })
    );
    renderCart([{ productId: "mug", quantity: 10 }]);
    const form = screen.getByRole("button", { name: "Submit Order Request" }).closest("form")!;
    expect(
      within(form).getByText(
        "Attach your logo (optional). We will place it on your items and send you a final quote with shipping, setup and any other costs. Nothing is charged until you approve the quote and pay."
      )
    ).toBeInTheDocument();
    // The old "email your logo files afterwards" wording and the artwork-confirmation promise are gone.
    expect(form.textContent).not.toMatch(/by replying to the confirmation email/);
    expect(form.textContent).not.toMatch(/confirm artwork/i);
    // No proof or mockup step exists in the order lifecycle, so none is promised.
    expect(form.textContent).not.toMatch(/proof|mockup/i);

    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Submit Order Request" }));
    await screen.findByText("Order Request Received");
    // No logo was attached, so the shopper is asked to reply with it.
    expect(screen.getByRole("status").textContent).toContain(
      "Reply to the confirmation email with your logo (vector PDF, AI, EPS or PNG)."
    );
  });

  it("tells the shopper where to send logos when no confirmation email went out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, orderRef: "MG-00007", confirmationEmailed: false }),
      })
    );
    renderCart([{ productId: "mug", quantity: 10 }]);
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Submit Order Request" }));
    await screen.findByText("Order Request Received");
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toContain("ben@magnoliagrovega.com and mention MG-00007");
    expect(text).not.toContain("Reply to the confirmation email");
  });
});

describe("shopper-facing error text", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  const GENERIC =
    "We couldn't send your request. Please email ben@magnoliagrovega.com or call (706) 573-1719.";

  it("builds the generic message from the real contact details", () => {
    expect(cartSendFailureMessage()).toBe(GENERIC);
  });

  it("hides server faults but keeps specific 4xx messages", () => {
    expect(shopperErrorMessage(503, "Email delivery is not configured yet.")).toBe(GENERIC);
    expect(shopperErrorMessage(500, "boom")).toBe(GENERIC);
    expect(shopperErrorMessage(undefined, undefined)).toBe(GENERIC);
    expect(shopperErrorMessage(400, 'Minimum order for "X" is 24 units.')).toBe(
      'Minimum order for "X" is 24 units.'
    );
    expect(shopperErrorMessage(429, "Too many requests. Please try again later.")).toBe(
      "Too many requests. Please try again later."
    );
    expect(shopperErrorMessage(400, "  ")).toBe(GENERIC);
  });

  async function submitWith(response: unknown) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    renderCart([{ productId: "mug", quantity: 10 }]);
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Submit Order Request" }));
    return screen.findByRole("alert");
  }

  it("never prints a config reason even if a server sends one with a 5xx", async () => {
    const alert = await submitWith({
      ok: false,
      status: 503,
      json: async () => ({ success: false, error: "Email delivery is not configured yet." }),
    });
    expect(alert).toHaveTextContent(GENERIC);
    expect(alert.textContent).not.toMatch(/configured/i);
  });

  it("shows the generic message when the request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    renderCart([{ productId: "mug", quantity: 10 }]);
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Submit Order Request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(GENERIC);
  });

  it("still shows a specific cart message on a 400", async () => {
    const alert = await submitWith({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: 'Please choose a color for "Test Polo".' }),
    });
    expect(alert).toHaveTextContent('Please choose a color for "Test Polo".');
  });

  it("keeps field-level validation errors specific", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: "Validation failed.",
          issues: { formErrors: [], fieldErrors: { email: ["Enter a valid email address."] } },
        }),
      })
    );
    renderCart([{ productId: "mug", quantity: 10 }]);
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Submit Order Request" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText(/Please fix the highlighted fields/)).toBeInTheDocument();
  });
});

describe("customer confirmation email", () => {
  const build = (items: Parameters<typeof buildMerchRequestConfirmationEmail>[0]["items"]) =>
    buildMerchRequestConfirmationEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderRef: "MG-00007",
      items,
      total: 120,
    });

  it("shows each line's sizes and imprint notes, escaped, and omits them when absent", () => {
    const { html } = build([
      {
        name: "Test Polo",
        color: "Navy",
        sizes: "24 M, 60 L <b>x</b>",
        imprintNotes: "Left chest & sleeve",
        quantity: 84,
        unitPrice: 20,
        lineTotal: 1680,
      },
      { name: "Test Mug", quantity: 10, unitPrice: 5, lineTotal: 50 },
    ]);
    expect(html).toContain("Sizes and quantities: 24 M, 60 L &lt;b&gt;x&lt;/b&gt;");
    expect(html).toContain("Imprint notes: Left chest &amp; sleeve");
    expect(html).not.toContain("<b>x</b>");
    expect(html.match(/Sizes and quantities:/g)).toHaveLength(1);
  });

  it("says what happens to the request, and asks for a reply with the logo only when none was attached", () => {
    const items = [{ name: "Test Mug", quantity: 10, unitPrice: 5, lineTotal: 50 }];
    const request =
      "We have your request MG-00007. We will place your logo on your items and email you a final quote with shipping and other costs.";
    const reply = "Reply to this email with your logo (vector PDF, AI, EPS or PNG).";

    const without = build(items);
    expect(without.html).toContain(request);
    expect(without.html).toContain(reply);
    expect(without.text).toContain(request);
    expect(without.text).toContain(reply);

    const withLogo = buildMerchRequestConfirmationEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderRef: "MG-00007",
      items,
      total: 120,
      logoAttached: true,
    });
    expect(withLogo.html).toContain(request);
    expect(withLogo.html).not.toContain(reply);
    expect(withLogo.text).not.toContain(reply);

    // No mockup or proof step exists, so none is promised.
    expect(without.html + withLogo.html).not.toMatch(/proof|mockup/i);
    expect(without.html).not.toMatch(/replying to this confirmation email/);
  });
});

describe("admin order views", () => {
  const record: OrderRecord = {
    id: 7,
    createdAt: "2026-10-01T12:00:00.000Z",
    readAt: "2026-10-01T12:00:00.000Z",
    data: {
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
      phone: "706-555-0100",
      status: "new",
      total: 1730,
      items: [
        {
          productId: "polo",
          name: "Test Polo",
          color: "Navy",
          quantity: 84,
          sizes: "24 M, 60 L",
          imprintNotes: "Left chest, white ink",
          unitPrice: 20,
          lineTotal: 1680,
        },
        // Stored before sizes and notes existed.
        { productId: "mug", name: "Test Mug", quantity: 10, unitPrice: 5, lineTotal: 50 },
      ],
    },
  };

  it("reads the new fields and tolerates orders without them", () => {
    const items = readOrderItems(record.data);
    expect(items[0]).toMatchObject({ sizes: "24 M, 60 L", imprintNotes: "Left chest, white ink" });
    expect(items[1]).not.toHaveProperty("sizes");
    expect(items[1]).not.toHaveProperty("imprintNotes");
    expect(
      readOrderItems({ items: [{ name: "X", quantity: 1, sizes: 5, imprintNotes: " " }] })[0]
    ).not.toHaveProperty("sizes");
  });

  it("shows sizes and imprint notes in the order detail", () => {
    render(<OrderDetail order={record} items={readOrderItems(record.data)} />);
    expect(screen.getAllByText(/24 M, 60 L/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Left chest, white ink/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sizes and quantities:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Imprint notes:/).length).toBeGreaterThan(0);
  });

  it("puts them on the backend order sheet", () => {
    const sheet = buildBackendOrderSheet({ orderId: 7 }, readOrderItems(record.data));
    expect(sheet).toContain("Sizes and quantities: 24 M, 60 L");
    expect(sheet).toContain("Imprint notes: Left chest, white ink");
    expect(sheet.match(/Sizes and quantities:/g)).toHaveLength(1);
  });
});
