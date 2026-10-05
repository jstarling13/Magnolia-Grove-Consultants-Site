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
