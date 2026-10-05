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
import OrderTimeline from "@/components/admin/orders/OrderTimeline";
import {
  buildOrderTimeline,
  emptyStatusCounts,
  paginate,
  readOrderItems,
  toOrderListItem,
  type OrderRecord,
} from "@/lib/adminOrders";
import { MERCH_ORDER_STATUSES, MERCH_ORDER_STATUS_LABELS } from "@/lib/merchOrders";

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

describe("OrdersList", () => {
  const counts = { ...emptyStatusCounts(), new: 2, paid: 1 };

  function renderList(
    records: OrderRecord[],
    filter = { q: "", page: 1 } as never,
    total = records.length
  ) {
    return render(
      <OrdersList
        items={records.map((r) => toOrderListItem(r, NOW))}
        counts={counts}
        allCount={3}
        filter={filter}
        page={paginate(total, (filter as { page: number }).page)}
        username="ben"
      />
    );
  }

  it("shows a tab with a count for every status plus All", () => {
    renderList([record(1, {})]);
    const nav = screen.getByRole("navigation", { name: "Order status" });
    expect(within(nav).getByRole("link", { name: /^All \(3\)/ })).toBeInTheDocument();
    for (const status of MERCH_ORDER_STATUSES) {
      expect(
        within(nav).getByRole("link", {
          name: new RegExp(`^${MERCH_ORDER_STATUS_LABELS[status]} \\(`),
        })
      ).toBeInTheDocument();
    }
    expect(within(nav).getByRole("link", { name: /^New \(2\)/ })).toHaveAttribute(
      "href",
      "/admin/orders?status=new"
    );
    expect(within(nav).getByRole("link", { name: /^All/ })).toHaveAttribute("aria-current", "page");
  });

  it("keeps the search text when switching tabs and highlights the active tab", () => {
    renderList([], { q: "pat", status: "paid", page: 1 } as never);
    const nav = screen.getByRole("navigation", { name: "Order status" });
    expect(within(nav).getByRole("link", { name: /^Paid/ })).toHaveAttribute(
      "href",
      "/admin/orders?status=paid&q=pat"
    );
    expect(within(nav).getByRole("link", { name: /^Paid/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByText("No orders match this filter.")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("pat");
    // Search form carries the status so the tab survives a new search.
    expect(document.querySelector('input[type="hidden"][name="status"]')).toHaveValue("paid");
  });

  it("renders reference, customer, items, total, status, age and flags per row", () => {
    renderList([
      record(
        42,
        {
          status: "paid",
          paidAt: new Date(NOW - DAY).toISOString(),
          quotedTotal: 912.5,
          items: [
            { name: "Pen", quantity: 250 },
            { name: "Mug", quantity: 100 },
          ],
        },
        3 * DAY
      ),
      record(43, { status: "new", total: 50, items: [{ name: "Koozie", quantity: 1 }] }, 2 * DAY),
    ]);
    const row = document.querySelector('[data-order-row="MG-00042"]') as HTMLElement;
    expect(within(row).getByRole("link", { name: "MG-00042" })).toHaveAttribute(
      "href",
      "/admin/orders/42"
    );
    expect(within(row).getByText("Pat Lee")).toBeInTheDocument();
    expect(within(row).getByText("2 items")).toBeInTheDocument();
    expect(within(row).getByText("350 units")).toBeInTheDocument();
    expect(within(row).getByText("$912.50")).toBeInTheDocument();
    expect(within(row).getByText("Quoted")).toBeInTheDocument();
    expect(within(row).getByText("Paid")).toBeInTheDocument();
    expect(within(row).getByText("3d")).toBeInTheDocument();
    expect(within(row).getByText("Paid, not ordered in ESP")).toBeInTheDocument();

    const other = document.querySelector('[data-order-row="MG-00043"]') as HTMLElement;
    expect(within(other).getByText("$50.00")).toBeInTheDocument();
    expect(within(other).getByText("Cart estimate")).toBeInTheDocument();
    expect(within(other).getByText("New for over a day")).toBeInTheDocument();
    expect(screen.getByText(/2 orders on this page need attention/)).toBeInTheDocument();
  });

  it("offers an export link for the current filter", () => {
    renderList([record(1, {})], { q: "lee", status: "paid", page: 2 } as never, 60);
    expect(screen.getByRole("link", { name: /Export CSV/ })).toHaveAttribute(
      "href",
      "/admin/orders/export?status=paid&q=lee"
    );
  });

  it("paginates with prev/next links that keep the filter", () => {
    renderList([record(1, {})], { q: "lee", page: 2 } as never, 60);
    const pager = screen.getByRole("navigation", { name: "Pagination" });
    expect(screen.getByText("Showing 26-50 of 60 orders")).toBeInTheDocument();
    expect(within(pager).getByText("Page 2 of 3")).toBeInTheDocument();
    expect(within(pager).getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/admin/orders?q=lee"
    );
    expect(within(pager).getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/admin/orders?q=lee&page=3"
    );
  });

  it("has no pager for a single page", () => {
    renderList([record(1, {})]);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  });
});

describe("OrderTimeline", () => {
  it("shows stored times and marks missing steps as pending", () => {
    render(
      <OrderTimeline
        steps={buildOrderTimeline("2026-10-01T14:00:00.000Z", {
          status: "awaiting_payment",
          quotedAt: "2026-10-02T14:00:00.000Z",
          paymentUrl: "https://square.link/u/a",
        })}
      />
    );
    const timeline = screen.getByRole("list", { name: "Order timeline" });
    expect(within(timeline).getByText(/Oct 1, 2026, 10:00 AM/)).toBeInTheDocument();
    expect(timeline.querySelector('[data-step="paid"]')).toHaveAttribute("data-done", "false");
    expect(
      within(timeline.querySelector('[data-step="paid"]') as HTMLElement).getByText("Pending")
    ).toBeInTheDocument();
    expect(
      within(timeline.querySelector('[data-step="shipped"]') as HTMLElement).getByText("Pending")
    ).toBeInTheDocument();
    expect(timeline.querySelector('[data-step="link_sent"]')).toHaveAttribute("data-done", "true");
  });
});

describe("OrderDetail", () => {
  const order = record(
    42,
    {
      status: "paid",
      notes: "Need by Friday",
      total: 500,
      quotedTotal: 912.5,
      quotedAt: new Date(NOW - 5 * DAY).toISOString(),
      paymentUrl: "https://square.link/u/abc",
      paidAt: new Date(NOW - 2 * DAY).toISOString(),
      items: [
        {
          productId: "pen",
          name: "Metal Pen",
          color: "Navy",
          quantity: 250,
          unitPrice: 1.5,
          lineTotal: 375,
          espUrl: "https://espplus.com/products/555990121",
          espKind: "product",
          supplier: "Prime Line",
          productNo: "OD618",
        },
        { productId: "mug", name: "Mug", quantity: 100, unitPrice: 5, lineTotal: 500 },
      ],
    },
    6 * DAY
  );

  function renderDetail(o = order) {
    return render(<OrderDetail order={o} items={readOrderItems(o.data)} now={NOW} />);
  }

  beforeEach(() => vi.clearAllMocks());

  it("shows the header, contacts, flags, notes and totals", () => {
    renderDetail();
    const screenView = document.querySelector("[data-screen-view]") as HTMLElement;
    expect(within(screenView).getByRole("heading", { name: "MG-00042" })).toBeInTheDocument();
    expect(within(screenView).getAllByText("Paid").length).toBeGreaterThan(0);
    expect(within(screenView).getByRole("link", { name: "pat@example.com" })).toHaveAttribute(
      "href",
      "mailto:pat@example.com"
    );
    expect(within(screenView).getByRole("link", { name: "706-555-0100" })).toHaveAttribute(
      "href",
      "tel:7065550100"
    );
    expect(within(screenView).getByText("Paid, not ordered in ESP")).toBeInTheDocument();
    expect(within(screenView).getByText("Need by Friday")).toBeInTheDocument();
    expect(within(screenView).getByText("Cart estimate: $500.00")).toBeInTheDocument();
    expect(within(screenView).getByText("Quoted total: $912.50")).toBeInTheDocument();
  });

  it("lists items with color, quantity, prices and the backend ESP+ details", () => {
    renderDetail();
    const screenView = document.querySelector("[data-screen-view]") as HTMLElement;
    const items = within(screenView).getByRole("region", { name: "Items" });
    const penRow = within(items).getByText("Metal Pen").closest("tr") as HTMLElement;
    expect(within(penRow).getByText("Navy")).toBeInTheDocument();
    expect(within(penRow).getByText("250")).toBeInTheDocument();
    expect(within(penRow).getByText("$1.50")).toBeInTheDocument();
    expect(within(penRow).getByText("$375.00")).toBeInTheDocument();
    expect(within(penRow).getByRole("link", { name: "Open in ESP+" })).toHaveAttribute(
      "href",
      "https://espplus.com/products/555990121"
    );
    expect(within(penRow).getByText("Supplier: Prime Line")).toBeInTheDocument();
    expect(within(penRow).getByText("Product no. OD618")).toBeInTheDocument();
    const mugRow = within(items).getByText("Mug").closest("tr") as HTMLElement;
    expect(within(mugRow).getByText("Not specified")).toBeInTheDocument();
    expect(within(mugRow).getByText("No link")).toBeInTheDocument();
  });

  it("does not turn a non-http ESP link into a clickable href", () => {
    const bad = record(9, {
      items: [{ name: "Pen", quantity: 1, espUrl: "javascript:alert(1)", espKind: "product" }],
    });
    renderDetail(bad);
    expect(screen.queryByRole("link", { name: "Open in ESP+" })).not.toBeInTheDocument();
  });

  it("renders a print-only one-page order sheet and hides the app view when printing", () => {
    renderDetail();
    const screenView = document.querySelector("[data-screen-view]") as HTMLElement;
    expect(screenView.className).toContain("print:hidden");

    const sheet = document.querySelector("[data-print-sheet]") as HTMLElement;
    expect(sheet.className).toContain("hidden");
    expect(sheet.className).toContain("print:block");
    expect(within(sheet).getByRole("heading", { name: "Backend order sheet" })).toBeInTheDocument();
    expect(within(sheet).getByText("MG-00042")).toBeInTheDocument();
    expect(within(sheet).getByText("Pat Lee")).toBeInTheDocument();
    expect(within(sheet).getByText("pat@example.com")).toBeInTheDocument();
    expect(within(sheet).getByText("706-555-0100")).toBeInTheDocument();
    expect(within(sheet).getByText("Metal Pen")).toBeInTheDocument();
    expect(within(sheet).getByText("Navy")).toBeInTheDocument();
    expect(within(sheet).getByText("250")).toBeInTheDocument();
    // ESP link printed as text, not only as a link.
    expect(within(sheet).getByText("https://espplus.com/products/555990121")).toBeInTheDocument();
    expect(within(sheet).getByText("Need by Friday")).toBeInTheDocument();
    // No customer prices or quotes on the backend sheet.
    expect(within(sheet).queryByText(/\$/)).not.toBeInTheDocument();
    expect(sheet.querySelector("style")?.textContent).toContain("@page");
  });

  it("prints with window.print()", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Print order sheet" }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it("copies the order sheet text in one click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Copy order sheet" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument());
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("Backend order sheet - MG-00042");
    expect(text).toContain("1. 250 x Metal Pen");
    expect(text).toContain("ESP+ link: https://espplus.com/products/555990121");
    expect(text).toContain("Customer notes: Need by Friday");
  });

  it("falls back to selectable text when the clipboard is unavailable", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Copy order sheet" }));
    const box = (await screen.findByLabelText("Backend order sheet text")) as HTMLTextAreaElement;
    expect(box.value).toContain("MG-00042");
  });

  it("reuses the existing actions: ESP order number and shipment", async () => {
    actions.recordEspOrder.mockResolvedValue({ ok: true });
    actions.markMerchShipped.mockResolvedValue({ ok: true, emailed: true });
    renderDetail();

    fireEvent.change(screen.getByLabelText(/ESP order number/), { target: { value: "ESP-1001" } });
    fireEvent.click(screen.getByRole("button", { name: "Save & mark Ordered in ESP" }));
    await waitFor(() => expect(actions.recordEspOrder).toHaveBeenCalledWith(42, "ESP-1001"));
    expect(await screen.findByText("ESP order number saved.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Carrier"), { target: { value: "UPS" } });
    fireEvent.change(screen.getByLabelText("Tracking number"), { target: { value: "1Z 999 AA1" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark shipped & email customer" }));
    await waitFor(() =>
      expect(actions.markMerchShipped).toHaveBeenCalledWith(42, {
        carrier: "UPS",
        trackingNumber: "1Z999AA1",
      })
    );
  });

  it("validates fulfillment input with the shared parsers before calling an action", () => {
    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Save & mark Ordered in ESP" }));
    expect(screen.getByText("Enter the ESP order number.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark shipped & email customer" }));
    expect(actions.recordEspOrder).not.toHaveBeenCalled();
    expect(actions.markMerchShipped).not.toHaveBeenCalled();
  });

  it("changes status through the existing action and surfaces its refusal", async () => {
    actions.updateMerchOrderStatus.mockResolvedValue({
      ok: false,
      error: "Payment hasn't been received yet.",
    });
    renderDetail(record(7, { status: "reviewing" }));
    fireEvent.change(screen.getByLabelText("Order Status"), {
      target: { value: "ordered_in_esp" },
    });
    await waitFor(() =>
      expect(actions.updateMerchOrderStatus).toHaveBeenCalledWith(7, "ordered_in_esp")
    );
    expect(await screen.findByText("Payment hasn't been received yet.")).toBeInTheDocument();
  });

  it("sends a payment link for an unpaid order using the existing action", async () => {
    actions.sendMerchPaymentLink.mockResolvedValue({
      ok: true,
      url: "https://square.link/u/x",
      emailed: true,
    });
    renderDetail(record(8, { status: "reviewing", total: 750.88 }));
    expect((screen.getByLabelText("Final quote amount in dollars") as HTMLInputElement).value).toBe(
      "750.88"
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Payment Link" }));
    await waitFor(() => expect(actions.sendMerchPaymentLink).toHaveBeenCalledWith(8, 750.88));
    expect(await screen.findByText("Payment link emailed to the customer.")).toBeInTheDocument();
    // Fulfillment stays locked until paid.
    expect(screen.getByText(/Available once payment is received/)).toBeInTheDocument();
  });

  it("falls back to the quote-request text when there are no cart lines", () => {
    renderDetail(record(3, { product: "Koozies", quantity: "300" }));
    const screenView = document.querySelector("[data-screen-view]") as HTMLElement;
    expect(within(screenView).getByText("Koozies - Estimated quantity 300")).toBeInTheDocument();
  });
});
