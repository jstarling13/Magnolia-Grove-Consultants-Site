import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

vi.mock("@/app/admin/actions", () => actions);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import Dashboard, { type SubmissionRow } from "@/components/admin/Dashboard";

function merchRow(data: Record<string, unknown>, id = 7): SubmissionRow {
  return {
    id,
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

const paid = { status: "paid", quotedTotal: 912.5, paidAt: "2026-10-06T15:00:00.000Z" };

describe("order reference in the dashboard", () => {
  it("shows the customer-facing reference on the row and in the expanded order", () => {
    renderExpanded(merchRow({}, 42));
    expect(screen.getAllByText(/MG-00042/).length).toBeGreaterThanOrEqual(2);
  });
});

describe("merch fulfillment panel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is locked with an explanation until the order is paid", () => {
    renderExpanded(merchRow({ status: "awaiting_payment" }));
    expect(screen.getByText(/Available once payment is received/)).toBeTruthy();
    expect(screen.queryByLabelText("Tracking number")).toBeNull();
    expect(screen.queryByRole("button", { name: /Mark shipped/ })).toBeNull();
  });

  it("is hidden for cancelled orders", () => {
    renderExpanded(merchRow({ status: "cancelled" }));
    expect(screen.queryByText("Fulfillment")).toBeNull();
  });

  it("records the ESP order number and moves a paid order to Ordered in ESP", async () => {
    actions.recordEspOrder.mockResolvedValue({ ok: true });
    renderExpanded(merchRow(paid));

    fireEvent.change(screen.getByLabelText(/ESP order number/), {
      target: { value: " PO-12345 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save & mark Ordered in ESP" }));

    await waitFor(() => expect(actions.recordEspOrder).toHaveBeenCalledWith(7, "PO-12345"));
    expect(await screen.findByText("ESP order number saved.")).toBeTruthy();
  });

  it("prefills a saved ESP order number and offers a plain save once already ordered", () => {
    renderExpanded(merchRow({ ...paid, status: "ordered_in_esp", espOrderNumber: "PO-777" }));
    expect((screen.getByLabelText(/ESP order number/) as HTMLInputElement).value).toBe("PO-777");
    expect(screen.getByRole("button", { name: "Save ESP order number" })).toBeTruthy();
    // The raw value is shown only in the admin input, not echoed in the generic field list.
    expect(screen.queryAllByText("PO-777")).toHaveLength(0);
  });

  it("rejects a bad ESP order number without calling the server", () => {
    renderExpanded(merchRow(paid));
    fireEvent.change(screen.getByLabelText(/ESP order number/), { target: { value: "<script>" } });
    fireEvent.click(screen.getByRole("button", { name: "Save & mark Ordered in ESP" }));
    expect(screen.getByText(/letters, numbers, spaces/)).toBeTruthy();
    expect(actions.recordEspOrder).not.toHaveBeenCalled();
  });

  it("surfaces a server refusal when saving the ESP order number", async () => {
    actions.recordEspOrder.mockResolvedValue({
      ok: false,
      error: "Payment hasn't been received yet.",
    });
    renderExpanded(merchRow(paid));
    fireEvent.change(screen.getByLabelText(/ESP order number/), { target: { value: "PO-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save & mark Ordered in ESP" }));
    expect(await screen.findByText("Payment hasn't been received yet.")).toBeTruthy();
  });

  it("marks shipped with carrier and tracking and reports the email", async () => {
    actions.markMerchShipped.mockResolvedValue({ ok: true, emailed: true });
    renderExpanded(merchRow({ ...paid, status: "ordered_in_esp" }));

    fireEvent.change(screen.getByLabelText("Carrier"), { target: { value: "UPS" } });
    fireEvent.change(screen.getByLabelText("Tracking number"), {
      target: { value: "1Z 999 AA1 0123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mark shipped & email customer" }));

    await waitFor(() =>
      expect(actions.markMerchShipped).toHaveBeenCalledWith(7, {
        carrier: "UPS",
        trackingNumber: "1Z999AA10123",
      })
    );
    expect(await screen.findByText(/The customer was emailed their tracking details/)).toBeTruthy();
  });

  it("tells the admin to contact the customer when the shipped email didn't send", async () => {
    actions.markMerchShipped.mockResolvedValue({ ok: true, emailed: false });
    renderExpanded(merchRow(paid));
    fireEvent.change(screen.getByLabelText("Carrier"), { target: { value: "FedEx" } });
    fireEvent.change(screen.getByLabelText("Tracking number"), {
      target: { value: "123456789012" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mark shipped & email customer" }));
    expect(await screen.findByText(/email didn't send/)).toBeTruthy();
  });

  it("validates carrier and tracking number client-side", () => {
    renderExpanded(merchRow(paid));
    fireEvent.click(screen.getByRole("button", { name: "Mark shipped & email customer" }));
    expect(screen.getByText(/Enter the carrier/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Carrier"), { target: { value: "UPS" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark shipped & email customer" }));
    expect(screen.getByText(/Enter the tracking number/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Tracking number"), { target: { value: "12<b>45" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark shipped & email customer" }));
    expect(screen.getByText(/5 to 40 letters, numbers, or dashes/)).toBeTruthy();
    expect(actions.markMerchShipped).not.toHaveBeenCalled();
  });

  it("surfaces a server refusal when marking shipped", async () => {
    actions.markMerchShipped.mockResolvedValue({ ok: false, error: "This order was cancelled." });
    renderExpanded(merchRow(paid));
    fireEvent.change(screen.getByLabelText("Carrier"), { target: { value: "UPS" } });
    fireEvent.change(screen.getByLabelText("Tracking number"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark shipped & email customer" }));
    expect(await screen.findByText("This order was cancelled.")).toBeTruthy();
  });

  it("shows the shipped state, prefills tracking, and offers to resend", () => {
    renderExpanded(
      merchRow({
        ...paid,
        status: "fulfilled",
        carrier: "UPS",
        trackingNumber: "1Z999AA10123456784",
        shippedAt: "2026-10-08T10:00:00.000Z",
      })
    );
    expect(screen.getByText(/shipped Oct/)).toBeTruthy();
    expect((screen.getByLabelText("Carrier") as HTMLInputElement).value).toBe("UPS");
    expect((screen.getByLabelText("Tracking number") as HTMLInputElement).value).toBe(
      "1Z999AA10123456784"
    );
    expect(screen.getByRole("button", { name: "Update tracking & resend email" })).toBeTruthy();
  });
});
