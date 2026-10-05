// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  store: {} as Record<number, Record<string, unknown>>,
  sendMerchPaidEmail: vi.fn(),
}));

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
    throw new Error(`unexpected query: ${text}`);
  },
}));
vi.mock("@/lib/square", () => ({ getPaymentLinkStatus: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendMerchPaidEmail: mocks.sendMerchPaidEmail }));

import { retryMissingPaidReceipts } from "@/lib/merchPayments";

const NOW = Date.parse("2026-10-20T12:00:00.000Z");

function paid(id: number, paidAt: string, extra: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    firstName: "Pat",
    email: "pat@example.com",
    status: "paid",
    quotedTotal: 100,
    paidAt,
    ...extra,
  };
  mocks.store[id] = { ...data };
  return { id, type: "merch_order", data: { ...data } };
}

describe("retryMissingPaidReceipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store = {};
    mocks.sendMerchPaidEmail.mockResolvedValue({ sent: true });
  });

  it("sends the receipt that previously failed, for an order paid within 14 days", async () => {
    const row = paid(1, "2026-10-18T12:00:00.000Z");
    await retryMissingPaidReceipts([row], NOW);
    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(1);
    expect(row.data.paidEmailSentAt).toBeTruthy();
  });

  it("keeps the claim released when the retry fails again, so a later pass can try once more", async () => {
    mocks.sendMerchPaidEmail.mockResolvedValue({ sent: false, reason: "boom" });
    const row = paid(2, "2026-10-18T12:00:00.000Z");
    await retryMissingPaidReceipts([row], NOW);
    expect(mocks.store[2].paidEmailSentAt).toBeUndefined();
    mocks.sendMerchPaidEmail.mockResolvedValue({ sent: true });
    await retryMissingPaidReceipts([row], NOW);
    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(2);
    expect(mocks.store[2].paidEmailSentAt).toBeTruthy();
  });

  it("never emails customers whose order was paid long ago", async () => {
    await retryMissingPaidReceipts([paid(3, "2026-09-01T12:00:00.000Z")], NOW);
    expect(mocks.sendMerchPaidEmail).not.toHaveBeenCalled();
  });

  it("skips orders that already got a receipt, were cancelled, or were never paid", async () => {
    const sent = paid(4, "2026-10-19T12:00:00.000Z", {
      paidEmailSentAt: "2026-10-19T12:01:00.000Z",
    });
    const cancelled = paid(5, "2026-10-19T12:00:00.000Z", { status: "cancelled" });
    const unpaid = {
      id: 6,
      type: "merch_order",
      data: { status: "awaiting_payment", email: "x@example.com" },
    };
    const other = { id: 7, type: "lead", data: { paidAt: "2026-10-19T12:00:00.000Z" } };
    await retryMissingPaidReceipts([sent, cancelled, unpaid, other], NOW);
    expect(mocks.sendMerchPaidEmail).not.toHaveBeenCalled();
  });

  it("sends one receipt even when two passes run at the same moment", async () => {
    const a = paid(8, "2026-10-19T12:00:00.000Z");
    const b = { id: 8, type: "merch_order", data: { ...a.data } };
    await Promise.all([retryMissingPaidReceipts([a], NOW), retryMissingPaidReceipts([b], NOW)]);
    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(1);
  });
});
