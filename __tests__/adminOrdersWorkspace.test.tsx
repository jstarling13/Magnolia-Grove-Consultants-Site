import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  markSubmissionRead: vi.fn(),
  addDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
  updateMerchOrderStatus: vi.fn(),
  sendMerchPaymentLink: vi.fn(),
  recordEspOrder: vi.fn(),
  markMerchShipped: vi.fn(),
}));
const refresh = vi.hoisted(() => vi.fn());

vi.mock("@/app/admin/actions", () => actions);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  redirect: vi.fn(),
}));

import OrdersList from "@/components/admin/orders/OrdersList";
import OrderDetail from "@/components/admin/orders/OrderDetail";
import {
  buildAuditTrail,
  buildQuoteSuggestion,
  describeAuditEntry,
  describeQuoteLine,
  emptyStatusCounts,
  paginate,
  readOrderItems,
  readQuoteBreakdown,
  suggestedQuoteTotal,
  toOrderListItem,
  type OrderFilter,
  type OrderRecord,
} from "@/lib/adminOrders";
import { makeAuditEntry, parseQuoteExtra, readAuditLog } from "@/lib/merchOrders";

const NOW = Date.parse("2026-10-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function record(id: number, data: Record<string, unknown>, ageMs = DAY / 2): OrderRecord {
  return {
    id,
    createdAt: new Date(NOW - ageMs).toISOString(),
    readAt: new Date(NOW).toISOString(),
    data: {
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
      phone: "706-555-0100",
      status: "new",
      ...data,
    },
  };
}

// ---------------------------------------------------------------------------
// 1. List: needs action, sort, filters
// ---------------------------------------------------------------------------

describe("OrdersList: needs action, sort and filters", () => {
  const counts = { ...emptyStatusCounts(), new: 3, paid: 2 };

  function renderList(filter: Partial<OrderFilter> = {}, withCounts = true) {
    const full = { q: "", page: 1, ...filter } as OrderFilter;
    return render(
      <OrdersList
        items={[record(1, {})].map((r) => toOrderListItem(r, NOW))}
        counts={counts}
        allCount={9}
        filter={full}
        page={paginate(1, 1)}
        {...(withCounts ? { actionCounts: { action: 4, paidNotOrdered: 1 } } : {})}
      />
    );
  }

  it("puts a Needs action panel above the search with counts for each group", () => {
    renderList();
    const panel = screen.getByRole("region", { name: "Needs action" });
    const nav = within(panel).getByRole("navigation", { name: "Needs action" });
    expect(
      within(nav).getByRole("link", { name: /Everything needing action \(4\)/ })
    ).toHaveAttribute("href", "/admin/orders?view=action");
    expect(within(nav).getByRole("link", { name: /New requests \(3\)/ })).toHaveAttribute(
      "href",
      "/admin/orders?status=new"
    );
    expect(
      within(nav).getByRole("link", { name: /Paid, not ordered in ESP \(1\)/ })
    ).toHaveAttribute("href", "/admin/orders?view=paid_not_ordered");
    // The panel comes before the search form in the document.
    expect(
      panel.compareDocumentPosition(screen.getByRole("search")) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("marks the active needs-action view and keeps search and sort in its links", () => {
    renderList({ view: "action", q: "acme", sort: "largest" });
    const nav = screen.getByRole("navigation", { name: "Needs action" });
    const active = within(nav).getByRole("link", { name: /Everything needing action/ });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: /New requests/ })).toHaveAttribute(
      "href",
      "/admin/orders?status=new&q=acme&sort=largest"
    );
    // The all-status chip is not active while a view is.
    const status = screen.getByRole("navigation", { name: "Order status" });
    expect(within(status).getByRole("link", { name: /^All/ })).not.toHaveAttribute("aria-current");
  });

  it("hides the panel when no action counts are supplied", () => {
    renderList({}, false);
    expect(screen.queryByRole("region", { name: "Needs action" })).not.toBeInTheDocument();
  });

  it("has status chips with counts and sort links that keep the filter and reset the page", () => {
    renderList({ status: "paid", q: "lee", page: 3 });
    const status = screen.getByRole("navigation", { name: "Order status" });
    expect(within(status).getByRole("link", { name: /^Paid \(2\)/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
    const sort = screen.getByRole("navigation", { name: "Sort orders" });
    expect(within(sort).getByRole("link", { name: "Newest" })).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(within(sort).getByRole("link", { name: "Oldest" })).toHaveAttribute(
      "href",
      "/admin/orders?status=paid&q=lee&sort=oldest"
    );
    expect(within(sort).getByRole("link", { name: "Largest total" })).toHaveAttribute(
      "href",
      "/admin/orders?status=paid&q=lee&sort=largest"
    );
  });

  it("highlights the chosen sort, carries it through search, and exports with the same filter", () => {
    renderList({ view: "paid_not_ordered", sort: "largest", q: "acme" });
    expect(
      within(screen.getByRole("navigation", { name: "Sort orders" })).getByRole("link", {
        name: "Largest total",
      })
    ).toHaveAttribute("aria-current", "true");
    expect(document.querySelector('input[type="hidden"][name="sort"]')).toHaveValue("largest");
    expect(document.querySelector('input[type="hidden"][name="view"]')).toHaveValue(
      "paid_not_ordered"
    );
    expect(screen.getByRole("link", { name: /Export CSV \(current filter\)/ })).toHaveAttribute(
      "href",
      "/admin/orders/export?view=paid_not_ordered&q=acme&sort=largest"
    );
  });

  it("the search box says it covers company, and is reachable by keyboard like every control here", () => {
    renderList();
    const box = screen.getByRole("searchbox");
    expect(box).toHaveAttribute("placeholder", expect.stringContaining("company"));
    // Native links, buttons and inputs only: all tabbable, none removed from the tab order.
    const panel = screen.getByRole("region", { name: "Needs action" });
    for (const control of [
      ...within(panel).getAllByRole("link"),
      ...within(screen.getByRole("navigation", { name: "Sort orders" })).getAllByRole("link"),
      box,
      screen.getByRole("button", { name: "Search" }),
    ]) {
      expect(control.getAttribute("tabindex")).not.toBe("-1");
      expect(control.className).toMatch(/focus-visible:ring-2/);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Quote helper
// ---------------------------------------------------------------------------

describe("quote suggestion", () => {
  it("sums qty x unit price per line using the cart's tier pricing helper", () => {
    const items = readOrderItems({
      items: [
        { name: "Pen", color: "Navy", quantity: 250, unitPrice: 1.5, lineTotal: 375 },
        { name: "Mug", quantity: 3, unitPrice: 0.1 },
        { name: "Legacy", quantity: 10, lineTotal: 55.555 },
        { name: "No price", quantity: 4 },
      ],
    });
    const suggestion = buildQuoteSuggestion(items);
    expect(suggestion.lines.map((l) => l.label)).toEqual(["Pen (Navy)", "Mug", "Legacy"]);
    expect(suggestion.lines[1].lineTotal).toBe(0.3); // rounded to cents, no float noise
    expect(suggestion.itemsSubtotal).toBe(430.86);
    expect(suggestion.unpricedLines).toBe(1);
    expect(describeQuoteLine(suggestion.lines[0])).toBe("250 x $1.50 = $375.00");
    expect(describeQuoteLine(suggestion.lines[2])).toBe("10 units = $55.56");
  });

  it("recomputes from quantity and unit price instead of trusting a stored line total", () => {
    const [line] = buildQuoteSuggestion(
      readOrderItems({ items: [{ name: "Pen", quantity: 100, unitPrice: 2, lineTotal: 1 }] })
    ).lines;
    expect(line.lineTotal).toBe(200);
  });

  it("adds the optional shipping or setup line", () => {
    expect(suggestedQuoteTotal(875, null)).toBe(875);
    expect(suggestedQuoteTotal(875, { label: "Shipping", amount: 37.5 })).toBe(912.5);
  });

  it("validates the extra line: zero means none, a charge needs a clean label", () => {
    expect(parseQuoteExtra(undefined)).toEqual({ ok: true, extra: null });
    expect(parseQuoteExtra({ label: "", amount: "" })).toEqual({ ok: true, extra: null });
    expect(parseQuoteExtra({ label: "  Setup\n fee ", amount: "25.005" })).toEqual({
      ok: true,
      extra: { label: "Setup fee", amount: 25.01 },
    });
    expect(parseQuoteExtra({ label: "", amount: 10 })).toMatchObject({ ok: false });
    expect(parseQuoteExtra({ label: "x", amount: -5 })).toMatchObject({ ok: false });
    expect(parseQuoteExtra({ label: "x", amount: Number.NaN })).toMatchObject({ ok: false });
    expect(parseQuoteExtra({ label: "x".repeat(61), amount: 5 })).toMatchObject({ ok: false });
    expect(parseQuoteExtra({ label: "x", amount: 9e9 })).toMatchObject({ ok: false });
  });

  it("reads the saved breakdown defensively", () => {
    expect(readQuoteBreakdown({})).toBeUndefined();
    expect(readQuoteBreakdown({ quoteBreakdown: "junk" })).toBeUndefined();
    expect(
      readQuoteBreakdown({
        quoteBreakdown: {
          itemsSubtotal: 875,
          suggestedTotal: 912.5,
          extra: { label: "Shipping", amount: 37.5 },
        },
      })
    ).toEqual({
      itemsSubtotal: 875,
      suggestedTotal: 912.5,
      extra: { label: "Shipping", amount: 37.5 },
    });
  });
});

describe("quote panel", () => {
  const items = {
    items: [
      {
        productId: "pen",
        name: "Metal Pen",
        color: "Navy",
        quantity: 250,
        unitPrice: 1.5,
        lineTotal: 375,
      },
      { productId: "mug", name: "Mug", quantity: 100, unitPrice: 5, lineTotal: 500 },
    ],
    total: 880,
  };

  function renderOrder(data: Record<string, unknown> = {}) {
    const o = record(42, { ...items, ...data }, 2 * DAY);
    return render(<OrderDetail order={o} items={readOrderItems(o.data)} now={NOW} />);
  }
  const amountField = () =>
    screen.getByLabelText("Final quote amount in dollars") as HTMLInputElement;

  beforeEach(() => {
    vi.clearAllMocks();
    actions.sendMerchPaymentLink.mockResolvedValue({ ok: true, url: "u", emailed: true });
  });

  it("pre-fills the amount with the sum of line totals and shows the line math", () => {
    renderOrder();
    expect(amountField().value).toBe("875.00"); // not the 880 cart estimate
    const math = screen.getByRole("list", { name: "Quote line math" });
    expect(within(math).getByText("Metal Pen (Navy)")).toBeInTheDocument();
    expect(within(math).getByText("250 x $1.50 = $375.00")).toBeInTheDocument();
    expect(within(math).getByText("100 x $5.00 = $500.00")).toBeInTheDocument();
    expect(screen.getByText("Suggested total").nextSibling).toHaveTextContent("$875.00");
  });

  it("never sends on its own: nothing is called until the button is pressed", async () => {
    renderOrder();
    expect(actions.sendMerchPaymentLink).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Charge amount in dollars/), {
      target: { value: "20" },
    });
    fireEvent.change(amountField(), { target: { value: "900" } });
    expect(actions.sendMerchPaymentLink).not.toHaveBeenCalled();
  });

  it("sends the amount alone when there is no extra line", async () => {
    renderOrder();
    fireEvent.click(screen.getByRole("button", { name: "Send Payment Link" }));
    await waitFor(() => expect(actions.sendMerchPaymentLink).toHaveBeenCalledWith(42, 875));
    expect(await screen.findByText("Payment link emailed to the customer.")).toBeInTheDocument();
  });

  it("an extra line moves the suggestion and the amount, and is sent with the quote", async () => {
    renderOrder();
    fireEvent.change(screen.getByLabelText(/Charge label/), { target: { value: "Shipping" } });
    fireEvent.change(screen.getByLabelText(/Charge amount in dollars/), {
      target: { value: "37.50" },
    });
    expect(amountField().value).toBe("912.50");
    expect(screen.getByText("Shipping").closest("li")).toHaveTextContent("$37.50");
    fireEvent.click(screen.getByRole("button", { name: "Send Payment Link" }));
    await waitFor(() =>
      expect(actions.sendMerchPaymentLink).toHaveBeenCalledWith(42, 912.5, {
        label: "Shipping",
        amount: 37.5,
      })
    );
  });

  it("an admin edit sticks, shows the difference, and can be reset to the suggestion", () => {
    renderOrder();
    fireEvent.change(amountField(), { target: { value: "1000" } });
    expect(screen.getByText("This is $125.00 above the suggested total.")).toBeInTheDocument();
    // A later extra no longer overwrites what the admin typed.
    fireEvent.change(screen.getByLabelText(/Charge label/), { target: { value: "Setup" } });
    fireEvent.change(screen.getByLabelText(/Charge amount in dollars/), {
      target: { value: "10" },
    });
    expect(amountField().value).toBe("1000");
    fireEvent.click(screen.getByRole("button", { name: "Reset to suggested" }));
    expect(amountField().value).toBe("885.00");
    expect(screen.queryByText(/above the suggested total/)).not.toBeInTheDocument();
  });

  it("a charge with no label is refused before anything is sent", () => {
    renderOrder();
    fireEvent.change(screen.getByLabelText(/Charge amount in dollars/), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Payment Link" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/label/);
    expect(actions.sendMerchPaymentLink).not.toHaveBeenCalled();
  });

  it("a previous quote and its extra are shown again, and the breakdown appears under the items", () => {
    renderOrder({
      status: "awaiting_payment",
      quotedTotal: 912.5,
      paymentUrl: "https://square.link/u/abc",
      quoteBreakdown: {
        itemsSubtotal: 875,
        suggestedTotal: 912.5,
        extra: { label: "Shipping", amount: 37.5 },
      },
    });
    expect(amountField().value).toBe("912.5");
    expect((screen.getByLabelText(/Charge label/) as HTMLInputElement).value).toBe("Shipping");
    expect(screen.getByText("Items $875.00 + Shipping $37.50")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend New Payment Link" })).toBeInTheDocument();
  });

  it("lines with no saved price are called out instead of silently counted as zero", () => {
    renderOrder({
      items: [
        { name: "Pen", quantity: 10, unitPrice: 2 },
        { name: "Mystery", quantity: 4 },
      ],
      total: 40,
    });
    expect(amountField().value).toBe("20.00");
    expect(screen.getByText(/1 line has no saved price/)).toBeInTheDocument();
  });

  it("falls back to the cart estimate for quote-request orders that have no lines", () => {
    renderOrder({ items: undefined, product: "Hoodies", quantity: "50", total: 640 });
    expect(amountField().value).toBe("640");
    expect(screen.queryByRole("list", { name: "Quote line math" })).not.toBeInTheDocument();
  });

  it("every new field is labelled, native and shows a keyboard focus ring", () => {
    renderOrder();
    for (const control of [
      screen.getByLabelText(/Charge label/),
      screen.getByLabelText(/Charge amount in dollars/),
      amountField(),
      screen.getByRole("button", { name: "Reset to suggested" }),
      screen.getByRole("button", { name: "Send Payment Link" }),
    ]) {
      expect(control.getAttribute("tabindex")).not.toBe("-1");
    }
    expect(screen.getByRole("button", { name: "Send Payment Link" }).className).toMatch(
      /focus-visible:ring-2/
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Copy for ESP+
// ---------------------------------------------------------------------------

describe("Copy for ESP+ block", () => {
  const data = {
    items: [
      {
        productId: "pen",
        name: "Metal Pen",
        color: "Navy",
        quantity: 250,
        sizes: "n/a",
        imprintNotes: "Barrel, white ink",
        unitPrice: 1.5,
        lineTotal: 375,
        espUrl: "https://espplus.com/products/555990121",
        espKind: "product",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("shows the plain text and copies exactly that text", async () => {
    const o = record(7, data);
    render(<OrderDetail order={o} items={readOrderItems(o.data)} now={NOW} />);
    const box = screen.getByLabelText("ESP+ reorder text") as HTMLTextAreaElement;
    expect(box.value).toContain("1. Metal Pen");
    expect(box.value).toContain("Color: Navy");
    expect(box.value).toContain("Quantity: 250");
    expect(box.value).toContain("Imprint notes: Barrel, white ink");
    expect(box.value).toContain("ESP+ link: https://espplus.com/products/555990121");

    fireEvent.click(screen.getByRole("button", { name: "Copy for ESP+" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(box.value));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByText(/copied to the clipboard/)).toBeInTheDocument();
  });

  it("tells the admin to copy by hand when the clipboard is blocked", async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("no"));
    const o = record(7, data);
    render(<OrderDetail order={o} items={readOrderItems(o.data)} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy for ESP+" }));
    expect(await screen.findByText(/Select the text below and copy it/)).toBeInTheDocument();
  });

  it("is not shown for quote-request orders that have no lines", () => {
    const o = record(8, { product: "Hoodies", quantity: "50" });
    render(<OrderDetail order={o} items={[]} now={NOW} />);
    expect(screen.queryByRole("button", { name: "Copy for ESP+" })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Audit trail
// ---------------------------------------------------------------------------

describe("audit trail", () => {
  const log = [
    {
      at: "2026-10-03T15:00:00.000Z",
      by: "ben",
      kind: "quote",
      from: "new",
      to: "awaiting_payment",
      detail: "$912.50 including Shipping $37.50",
    },
    {
      at: "2026-10-04T15:00:00.000Z",
      by: "Square",
      kind: "payment",
      from: "awaiting_payment",
      to: "paid",
      detail: "Payment detected automatically",
    },
    {
      at: "2026-10-05T15:00:00.000Z",
      by: "ben",
      kind: "status",
      from: "paid",
      to: "ordered_in_esp",
    },
  ];

  it("reads entries oldest first and drops malformed ones", () => {
    const entries = readAuditLog({
      auditLog: [
        log[2],
        "junk",
        null,
        { at: "not a date", by: "x", kind: "status" },
        { at: "2026-10-01T00:00:00.000Z", by: "", kind: "status" },
        { at: "2026-10-01T00:00:00.000Z", by: "x", kind: "bogus" },
        log[0],
      ],
    });
    expect(entries.map((e) => e.kind)).toEqual(["quote", "status"]);
    expect(readAuditLog({ auditLog: "nope" })).toEqual([]);
    expect(readAuditLog({})).toEqual([]);
  });

  it("describes each kind of change in plain words", () => {
    expect(
      describeAuditEntry(
        makeAuditEntry({ by: "b", kind: "status", from: "paid", to: "ordered_in_esp" })
      )
    ).toBe("Status changed from Paid to Ordered in ESP");
    expect(describeAuditEntry(makeAuditEntry({ by: "b", kind: "status", to: "cancelled" }))).toBe(
      "Status set to Cancelled"
    );
    expect(describeAuditEntry(readAuditLog({ auditLog: [log[0]] })[0])).toBe(
      "Quote and payment link created (status Awaiting Payment): $912.50 including Shipping $37.50"
    );
    expect(
      describeAuditEntry(makeAuditEntry({ by: "b", kind: "shipped", detail: "UPS 1Z999" }))
    ).toBe("Marked shipped: UPS 1Z999");
  });

  it("starts with the order being placed and lists who did each change", () => {
    const trail = buildAuditTrail("2026-10-02T12:00:00.000Z", { auditLog: log });
    expect(trail.hasHistory).toBe(true);
    expect(trail.rows.map((r) => r.by)).toEqual(["Customer", "ben", "Square", "ben"]);
    expect(trail.rows[0].text).toBe("Order placed");
  });

  it("orders placed before audit logging still render, with an explanation", () => {
    const o = record(9, { status: "paid", paidAt: "2026-10-02T00:00:00.000Z" }, 3 * DAY);
    render(<OrderDetail order={o} items={[]} now={NOW} />);
    const section = screen.getByRole("region", { name: "Audit trail" });
    expect(within(section).getAllByText(/Order placed/)).toHaveLength(1);
    expect(within(section).getByText(/before audit logging was added/)).toBeInTheDocument();
  });

  it("shows time and username for every recorded change on the order page", () => {
    const o = record(9, { status: "ordered_in_esp", auditLog: log }, 8 * DAY);
    render(<OrderDetail order={o} items={[]} now={NOW} />);
    const section = screen.getByRole("region", { name: "Audit trail" });
    const rows = section.querySelectorAll("[data-audit-row]");
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent("Quote and payment link created");
    expect(rows[1]).toHaveTextContent("Oct 3, 2026, 11:00 AM by ben");
    expect(rows[2]).toHaveTextContent("by Square");
    expect(rows[3]).toHaveTextContent("Status changed from Paid to Ordered in ESP");
    expect(within(section).queryByText(/before audit logging was added/)).not.toBeInTheDocument();
  });
});
