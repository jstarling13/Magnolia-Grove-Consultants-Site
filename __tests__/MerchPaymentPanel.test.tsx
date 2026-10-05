import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  markSubmissionRead: vi.fn(),
  addDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
  updateMerchOrderStatus: vi.fn(),
  sendMerchPaymentLink: vi.fn(),
}));

vi.mock("@/app/admin/actions", () => actions);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import Dashboard, { type SubmissionRow } from "@/components/admin/Dashboard";

function merchRow(data: Record<string, unknown>): SubmissionRow {
  return {
    id: 7,
    type: "merch_order",
    created_at: "2026-10-05T12:00:00.000Z",
    read_at: "2026-10-05T12:05:00.000Z",
    data: {
      firstName: "Test",
      lastName: "Order",
      email: "test.order@example.com",
      product: "2 items (BIC Pen, Cross Pen)",
      quantity: "512",
      total: 750.88,
      items: [],
      status: "new",
      ...data,
    },
  };
}

function renderExpanded(row: SubmissionRow) {
  render(<Dashboard submissions={[row]} username="ben" deliverablesBySubmission={{}} />);
  fireEvent.click(screen.getByText(/2 items \(BIC Pen, Cross Pen\)/));
}

describe("merch order payment panel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prefills the cart estimate and sends the entered final quote", async () => {
    actions.sendMerchPaymentLink.mockResolvedValue({
      ok: true,
      url: "https://square.link/u/abc",
      emailed: true,
    });
    renderExpanded(merchRow({}));

    const input = screen.getByLabelText("Final quote amount in dollars") as HTMLInputElement;
    expect(input.value).toBe("750.88");

    fireEvent.change(input, { target: { value: "912.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Payment Link" }));

    await waitFor(() => expect(actions.sendMerchPaymentLink).toHaveBeenCalledWith(7, 912.5));
    expect(await screen.findByText("Payment link emailed to the customer.")).toBeTruthy();
  });

  it("tells the admin to send the link manually when the email fails", async () => {
    actions.sendMerchPaymentLink.mockResolvedValue({
      ok: true,
      url: "https://square.link/u/abc",
      emailed: false,
    });
    renderExpanded(merchRow({}));
    fireEvent.click(screen.getByRole("button", { name: "Send Payment Link" }));

    expect(await screen.findByText(/email didn't send/)).toBeTruthy();
  });

  it("shows the live link and a resend option while awaiting payment", () => {
    renderExpanded(
      merchRow({
        status: "awaiting_payment",
        quotedTotal: 912.5,
        paymentUrl: "https://square.link/u/abc",
        paymentLinkId: "LINK1",
      })
    );
    expect(screen.getByText("https://square.link/u/abc")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Resend New Payment Link" })).toBeTruthy();
  });

  it("shows paid state and hides the send button once payment cleared", () => {
    renderExpanded(
      merchRow({ status: "paid", quotedTotal: 912.5, paidAt: "2026-10-06T15:00:00.000Z" })
    );
    expect(screen.getByText(/Paid \$912\.50 on/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Payment Link/ })).toBeNull();
  });

  it("labels a manually confirmed payment and doesn't invent an amount", () => {
    renderExpanded(
      merchRow({ status: "paid", paidAt: "2026-10-06T15:00:00.000Z", paidManually: true })
    );
    expect(screen.getByText(/Paid on .*\(marked paid manually\)/)).toBeTruthy();
    expect(screen.queryByText(/\$0\.00/)).toBeNull();
  });

  it("surfaces the refusal when ordering from ESP before payment", async () => {
    actions.updateMerchOrderStatus.mockResolvedValue({
      ok: false,
      error: "Payment hasn't been received yet — send the payment link first.",
    });
    renderExpanded(merchRow({ status: "awaiting_payment" }));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ordered_in_esp" } });

    expect(await screen.findByText(/Payment hasn't been received yet/)).toBeTruthy();
    expect(actions.updateMerchOrderStatus).toHaveBeenCalledWith(7, "ordered_in_esp");
  });
});

describe("merch order backend ESP details", () => {
  beforeEach(() => vi.clearAllMocks());

  const items = [
    {
      productId: "pen",
      name: "Metal Pen",
      quantity: 250,
      unitPrice: 1.5,
      lineTotal: 375,
      espUrl: "https://espplus.com/products/555990121",
      espKind: "product",
      supplier: "Prime Line",
      productNo: "OD618",
    },
    {
      productId: "mug",
      name: "Travel Mug",
      quantity: 100,
      unitPrice: 4,
      lineTotal: 400,
      espUrl: "https://espplus.com/products?q=Travel%20Mug&searchType=products",
      espKind: "search",
    },
    { productId: "old", name: "Legacy Cap", quantity: 12, unitPrice: 5, lineTotal: 60 },
  ];

  it("shows an Open in ESP+ link per line, flagging search fallbacks", () => {
    renderExpanded(merchRow({ items, notes: "Need by Friday", quotedTotal: 912.5 }));
    const links = screen.getAllByRole("link", { name: "Open in ESP+" });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://espplus.com/products/555990121");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0].getAttribute("rel")).toContain("noreferrer");
    const listText = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(listText.some((t) => /Supplier: Prime Line/.test(t ?? ""))).toBe(true);
    expect(listText.some((t) => /Product no\.\s+OD618/.test(t ?? ""))).toBe(true);
    expect(listText.filter((t) => /\(search link\)/.test(t ?? ""))).toHaveLength(1);
  });

  it("renders a copyable backend order sheet with notes and quoted total", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderExpanded(merchRow({ items, notes: "Need by Friday", quotedTotal: 912.5 }));

    const sheet = (screen.getByLabelText("Backend order sheet") as HTMLTextAreaElement).value;
    expect(sheet).toContain("250 x Metal Pen");
    expect(sheet).toContain("ESP+ link: https://espplus.com/products/555990121");
    expect(sheet).toContain("Supplier: Prime Line");
    expect(sheet).toContain("Product no.: OD618");
    expect(sheet).toContain("(search link)");
    expect(sheet).toContain("12 x Legacy Cap");
    expect(sheet).toContain("Customer notes: Need by Friday");
    expect(sheet).toContain("Quoted total: $912.50");

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(sheet));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("still renders orders stored before ESP fields existed", () => {
    renderExpanded(merchRow({ items: [items[2]] }));
    expect(screen.queryByRole("link", { name: "Open in ESP+" })).not.toBeInTheDocument();
    expect((screen.getByLabelText("Backend order sheet") as HTMLTextAreaElement).value).toContain(
      "12 x Legacy Cap"
    );
  });
});
