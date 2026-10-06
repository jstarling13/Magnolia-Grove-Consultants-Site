// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  store: {} as Record<number, Record<string, unknown>>,
  getPaymentLinkStatus: vi.fn(),
  sendMerchPaidEmail: vi.fn(),
}));

// A tiny stateful stand-in for the submissions table: it honors the conditional
// WHERE clauses the code relies on, so "once only" is tested against real logic.
vi.mock("@/lib/db", () => ({
  sql: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    const id = values.find((v): v is number => typeof v === "number") as number;
    const row = mocks.store[id];
    if (!row) return [];
    if (text.includes("data->>'paidEmailSentAt' IS NULL")) {
      if (row.paidEmailSentAt !== undefined) return [];
      row.paidEmailSentAt = JSON.parse(values[0] as string).paidEmailSentAt;
      return [{ id }];
    }
    if (text.includes("data - 'paidEmailSentAt'")) {
      delete row.paidEmailSentAt;
      return [];
    }
    if (text.includes("data->>'status' = 'awaiting_payment'")) {
      if (row.status !== "awaiting_payment") return [];
      Object.assign(row, JSON.parse(values[0] as string));
      return [{ id }];
    }
    throw new Error(`unexpected query: ${text}`);
  },
}));
vi.mock("@/lib/square", () => ({ getPaymentLinkStatus: mocks.getPaymentLinkStatus }));
vi.mock("@/lib/email", () => ({ sendMerchPaidEmail: mocks.sendMerchPaidEmail }));

import { sendMerchPaidEmailOnce, syncAwaitingMerchPayments } from "@/lib/merchPayments";

function awaiting(id: number) {
  const data: Record<string, unknown> = {
    firstName: "Pat",
    email: "pat@example.com",
    status: "awaiting_payment",
    quotedTotal: 912.5,
    paymentLinkId: `LINK${id}`,
  };
  mocks.store[id] = { ...data };
  return { id, type: "merch_order", data: { ...data } };
}

describe("sendMerchPaidEmailOnce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store = {};
    mocks.sendMerchPaidEmail.mockResolvedValue({ sent: true });
  });

  it("sends once, with the quoted total as the amount paid, then refuses repeats", async () => {
    mocks.store[5] = { status: "paid", paidAt: "2026-10-06T00:00:00.000Z" };
    const data = { firstName: "Pat", email: "pat@example.com", quotedTotal: 912.5 };

    expect(await sendMerchPaidEmailOnce(5, data)).toBe("sent");
    expect(await sendMerchPaidEmailOnce(5, data)).toBe("already_sent");
    expect(await sendMerchPaidEmailOnce(5, data)).toBe("already_sent");

    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledWith({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 5,
      amountPaid: 912.5,
      items: [],
    });
    expect(typeof mocks.store[5].paidEmailSentAt).toBe("string");
  });

  it("does not send twice when two callers race", async () => {
    mocks.store[5] = { status: "paid" };
    const data = { email: "pat@example.com" };
    const results = await Promise.all([
      sendMerchPaidEmailOnce(5, data),
      sendMerchPaidEmailOnce(5, data),
    ]);
    expect(results.sort()).toEqual(["already_sent", "sent"]);
    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("omits the amount when no quote is on record", async () => {
    mocks.store[5] = { status: "paid" };
    await sendMerchPaidEmailOnce(5, { email: "pat@example.com" });
    expect(mocks.sendMerchPaidEmail.mock.calls[0][0]).not.toHaveProperty("amountPaid");
  });

  it("releases the claim when the send fails so the record never claims an unsent email", async () => {
    mocks.store[5] = { status: "paid" };
    mocks.sendMerchPaidEmail.mockResolvedValue({ sent: false, reason: "not_configured" });
    expect(await sendMerchPaidEmailOnce(5, { email: "pat@example.com" })).toBe("failed");
    expect(mocks.store[5].paidEmailSentAt).toBeUndefined();
  });

  it("releases the claim when the send throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.store[5] = { status: "paid" };
    mocks.sendMerchPaidEmail.mockRejectedValue(new Error("boom"));
    expect(await sendMerchPaidEmailOnce(5, { email: "pat@example.com" })).toBe("failed");
    expect(mocks.store[5].paidEmailSentAt).toBeUndefined();
    spy.mockRestore();
  });

  it("does nothing without a customer email", async () => {
    mocks.store[5] = { status: "paid" };
    expect(await sendMerchPaidEmailOnce(5, {})).toBe("no_email");
    expect(mocks.sendMerchPaidEmail).not.toHaveBeenCalled();
  });
});

describe("syncAwaitingMerchPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store = {};
    mocks.sendMerchPaidEmail.mockResolvedValue({ sent: true });
  });

  it("marks a paid link paid and emails the customer once, across repeated dashboard loads", async () => {
    mocks.getPaymentLinkStatus.mockResolvedValue("paid");
    const first = awaiting(9);
    await syncAwaitingMerchPayments([first]);
    expect(first.data.status).toBe("paid");
    expect(typeof first.data.paidAt).toBe("string");
    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(1);

    // A second load of the dashboard reads the now-paid row: nothing to sync.
    const reload = { id: 9, type: "merch_order", data: { ...mocks.store[9] } };
    await syncAwaitingMerchPayments([reload]);
    // A stale second load that still sees "awaiting_payment" loses the conditional UPDATE.
    const stale = {
      id: 9,
      type: "merch_order",
      data: { ...first.data, status: "awaiting_payment" },
    };
    await syncAwaitingMerchPayments([stale]);

    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("does not email while the link is still unpaid", async () => {
    mocks.getPaymentLinkStatus.mockResolvedValue("unpaid");
    const row = awaiting(9);
    await syncAwaitingMerchPayments([row]);
    expect(row.data.status).toBe("awaiting_payment");
    expect(mocks.sendMerchPaidEmail).not.toHaveBeenCalled();
  });

  it("never emails for orders that were already paid before this load", async () => {
    mocks.store[3] = {
      status: "paid",
      paidAt: "2026-01-01T00:00:00.000Z",
      email: "old@example.com",
    };
    await syncAwaitingMerchPayments([
      { id: 3, type: "merch_order", data: { ...mocks.store[3], paymentLinkId: "OLD" } },
    ]);
    expect(mocks.getPaymentLinkStatus).not.toHaveBeenCalled();
    expect(mocks.sendMerchPaidEmail).not.toHaveBeenCalled();
  });

  it("still marks the order paid when the email fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getPaymentLinkStatus.mockResolvedValue("paid");
    mocks.sendMerchPaidEmail.mockRejectedValue(new Error("boom"));
    const row = awaiting(9);
    await syncAwaitingMerchPayments([row]);
    expect(row.data.status).toBe("paid");
    expect(mocks.store[9].status).toBe("paid");
    spy.mockRestore();
  });
});

describe("sendMerchPaidEmailOnce line items", () => {
  it("passes the stored order lines to the receipt email", async () => {
    vi.clearAllMocks();
    mocks.sendMerchPaidEmail.mockResolvedValue({ sent: true });
    mocks.store[9] = { status: "paid" };
    await sendMerchPaidEmailOnce(9, {
      firstName: "Pat",
      email: "pat@example.com",
      quotedTotal: 100,
      items: [{ name: "Tote Bag", color: "Navy", quantity: 50, unitPrice: 2, lineTotal: 100 }],
    });
    const payload = mocks.sendMerchPaidEmail.mock.calls[0][0];
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({ name: "Tote Bag", quantity: 50 });
  });
});
