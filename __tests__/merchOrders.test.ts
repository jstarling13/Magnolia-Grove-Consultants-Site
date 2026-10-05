import { describe, expect, it } from "vitest";
import { canSetMerchStatus, parseQuoteAmount, MERCH_ORDER_STATUSES } from "@/lib/merchOrders";

describe("canSetMerchStatus", () => {
  it("blocks ordering from ESP before payment is confirmed", () => {
    expect(canSetMerchStatus({ status: "awaiting_payment" }, "ordered_in_esp").ok).toBe(false);
    expect(canSetMerchStatus({ status: "quoted" }, "fulfilled").ok).toBe(false);
  });

  it("allows ordering from ESP once paidAt is recorded", () => {
    const paid = { status: "paid", paidAt: "2026-10-05T12:00:00.000Z" };
    expect(canSetMerchStatus(paid, "ordered_in_esp").ok).toBe(true);
    expect(canSetMerchStatus(paid, "fulfilled").ok).toBe(true);
  });

  it("never blocks the pre-order statuses or cancelling", () => {
    for (const status of ["new", "reviewing", "quoted", "awaiting_payment", "cancelled"] as const) {
      expect(canSetMerchStatus({}, status).ok).toBe(true);
    }
  });

  it("no longer offers the retired 'approved' status", () => {
    expect(MERCH_ORDER_STATUSES).not.toContain("approved");
  });
});

describe("parseQuoteAmount", () => {
  it("converts dollars to whole cents without float drift", () => {
    expect(parseQuoteAmount(750.88)).toEqual({ ok: true, cents: 75088 });
    expect(parseQuoteAmount(0.1 + 0.2)).toEqual({ ok: true, cents: 30 });
  });

  it("rejects zero, negative, and non-finite amounts", () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(parseQuoteAmount(bad).ok).toBe(false);
    }
  });

  it("rejects absurdly large quotes", () => {
    expect(parseQuoteAmount(250_000.01).ok).toBe(false);
    expect(parseQuoteAmount(250_000).ok).toBe(true);
  });
});
