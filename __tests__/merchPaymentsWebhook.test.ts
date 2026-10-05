// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  store: {} as Record<number, Record<string, unknown>>,
  getPaymentLinkStatus: vi.fn(),
  sendMerchPaidEmail: vi.fn(),
  selects: 0,
}));

// Stateful stand-in for the submissions table, including the SELECT that
// syncAllAwaitingMerchPayments issues, so the webhook path runs the real guards.
vi.mock("@/lib/db", () => ({
  sql: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    if (text.includes("SELECT id, type, data") && text.includes("data->>'paidAt' IS NOT NULL")) {
      // paid orders that never got a receipt (the retry sweep)
      return Object.entries(mocks.store)
        .filter(([, d]) => d.type === "merch_order" && d.paidAt && d.paidEmailSentAt === undefined)
        .map(([id, d]) => ({ id: Number(id), type: "merch_order", data: { ...d } }));
    }
    if (text.includes("SELECT id, type, data")) {
      mocks.selects += 1;
      expect(text).toContain("type = 'merch_order'");
      expect(text).toContain("data->>'status' = 'awaiting_payment'");
      return Object.entries(mocks.store)
        .filter(([, d]) => d.type === "merch_order" && d.status === "awaiting_payment")
        .map(([id, d]) => ({ id: Number(id), type: "merch_order", data: { ...d } }));
    }
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

import { syncAllAwaitingMerchPayments } from "@/lib/merchPayments";

function seed(id: number, status: string, type = "merch_order") {
  mocks.store[id] = {
    type,
    firstName: "Pat",
    email: `pat${id}@example.com`,
    status,
    quotedTotal: 100,
    paymentLinkId: `LINK${id}`,
  };
}

describe("syncAllAwaitingMerchPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store = {};
    mocks.selects = 0;
    mocks.sendMerchPaidEmail.mockResolvedValue({ sent: true });
  });

  it("is a no-op when nothing is awaiting payment", async () => {
    seed(1, "paid");
    seed(2, "quoted");
    expect(await syncAllAwaitingMerchPayments()).toBe(0);
    expect(mocks.getPaymentLinkStatus).not.toHaveBeenCalled();
    expect(mocks.sendMerchPaidEmail).not.toHaveBeenCalled();
  });

  it("only checks awaiting_payment merch orders", async () => {
    seed(1, "awaiting_payment");
    seed(2, "paid");
    seed(3, "new");
    seed(4, "awaiting_payment", "contact");
    mocks.getPaymentLinkStatus.mockResolvedValue("paid");

    expect(await syncAllAwaitingMerchPayments()).toBe(1);
    expect(mocks.getPaymentLinkStatus).toHaveBeenCalledTimes(1);
    expect(mocks.getPaymentLinkStatus).toHaveBeenCalledWith("LINK1");
    expect(mocks.store[1].status).toBe("paid");
    expect(mocks.store[2].status).toBe("paid");
    expect(mocks.store[3].status).toBe("new");
    expect(mocks.store[4].status).toBe("awaiting_payment");
    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("leaves unpaid links alone: a signed event alone never marks anything paid", async () => {
    seed(1, "awaiting_payment");
    mocks.getPaymentLinkStatus.mockResolvedValue("pending");
    await syncAllAwaitingMerchPayments();
    expect(mocks.store[1].status).toBe("awaiting_payment");
    expect(mocks.sendMerchPaidEmail).not.toHaveBeenCalled();
  });

  it("sends exactly one receipt when two deliveries run simultaneously", async () => {
    seed(1, "awaiting_payment");
    mocks.getPaymentLinkStatus.mockResolvedValue("paid");

    await Promise.all([syncAllAwaitingMerchPayments(), syncAllAwaitingMerchPayments()]);

    expect(mocks.selects).toBe(2);
    expect(mocks.store[1].status).toBe("paid");
    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("sends exactly one receipt across many duplicate deliveries, then does nothing", async () => {
    seed(1, "awaiting_payment");
    mocks.getPaymentLinkStatus.mockResolvedValue("paid");

    await Promise.all(Array.from({ length: 5 }, () => syncAllAwaitingMerchPayments()));
    await syncAllAwaitingMerchPayments();

    expect(mocks.sendMerchPaidEmail).toHaveBeenCalledTimes(1);
  });
});
