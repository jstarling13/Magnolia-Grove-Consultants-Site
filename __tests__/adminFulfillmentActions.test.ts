// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  row: undefined as Record<string, unknown> | undefined,
  updates: [] as Record<string, unknown>[],
  admin: true,
  sendMerchShippedEmail: vi.fn(),
  sendMerchPaidEmailOnce: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  sql: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    if (text.includes("SELECT data")) return mocks.row ? [{ data: mocks.row }] : [];
    if (text.includes("UPDATE submissions")) {
      const json = values.find((v) => typeof v === "string" && v.startsWith("{")) as
        string | undefined;
      // jsonb_set status updates pass the bare status instead of a JSON patch.
      const patch = json ? JSON.parse(json) : { status: values[0] };
      mocks.updates.push(patch);
      if (mocks.row) mocks.row = { ...mocks.row, ...patch };
      return [{ id: 1 }];
    }
    throw new Error(`unexpected query: ${text}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "token" }) }),
}));
vi.mock("@/lib/adminAuth", () => ({ ADMIN_SESSION_COOKIE: "admin" }));
vi.mock("@/lib/adminSessions", () => ({
  getVerifiedAdminSession: async () => (mocks.admin ? { username: "ben", issuedAt: 0 } : null),
}));
vi.mock("@/lib/square", () => ({
  createPaymentLink: vi.fn(),
  deletePaymentLink: vi.fn(),
  getPaymentLinkStatus: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendMerchPaymentLinkEmail: vi.fn(),
  sendMerchShippedEmail: mocks.sendMerchShippedEmail,
}));
vi.mock("@/lib/merchPayments", () => ({
  sendMerchPaidEmailOnce: mocks.sendMerchPaidEmailOnce,
  syncAwaitingMerchPayments: vi.fn(),
}));

import { markMerchShipped, recordEspOrder, updateMerchOrderStatus } from "@/app/admin/actions";

const paidOrder = {
  firstName: "Pat",
  email: "pat@example.com",
  status: "paid",
  paidAt: "2026-10-06T15:00:00.000Z",
  quotedTotal: 912.5,
  items: [
    {
      productId: "pen",
      name: "Pen",
      color: "Navy",
      quantity: 250,
      unitPrice: 1.5,
      lineTotal: 375,
      espUrl: "https://espplus.com/products/1",
      supplier: "Prime Line",
      productNo: "OD618",
    },
  ],
};

describe("fulfillment server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.admin = true;
    mocks.updates = [];
    mocks.row = { ...paidOrder };
    mocks.sendMerchShippedEmail.mockResolvedValue({ sent: true });
    mocks.sendMerchPaidEmailOnce.mockResolvedValue("sent");
  });

  describe("recordEspOrder", () => {
    it("saves the number and moves a paid order to ordered_in_esp", async () => {
      expect(await recordEspOrder(7, " PO-12345 ")).toEqual({ ok: true });
      expect(mocks.updates).toHaveLength(1);
      expect(mocks.updates[0]).toMatchObject({
        status: "ordered_in_esp",
        espOrderNumber: "PO-12345",
      });
      expect(typeof mocks.updates[0].espOrderedAt).toBe("string");
    });

    it("refuses before payment is confirmed", async () => {
      mocks.row = { ...paidOrder, status: "awaiting_payment", paidAt: undefined };
      const result = await recordEspOrder(7, "PO-12345");
      expect(result.ok).toBe(false);
      expect(mocks.updates).toHaveLength(0);
    });

    it("refuses without an admin session", async () => {
      mocks.admin = false;
      expect(await recordEspOrder(7, "PO-12345")).toEqual({ ok: false, error: "Not authorized." });
      expect(mocks.updates).toHaveLength(0);
    });

    it("validates the number", async () => {
      expect((await recordEspOrder(7, "")).ok).toBe(false);
      expect((await recordEspOrder(7, "<script>")).ok).toBe(false);
      expect(mocks.updates).toHaveLength(0);
    });

    it("keeps Fulfilled status when correcting the number on a shipped order", async () => {
      mocks.row = { ...paidOrder, status: "fulfilled" };
      await recordEspOrder(7, "PO-999");
      expect(mocks.updates[0]).toEqual({ espOrderNumber: "PO-999" });
    });

    it("refuses cancelled and missing orders", async () => {
      mocks.row = { ...paidOrder, status: "cancelled" };
      expect((await recordEspOrder(7, "PO-1")).ok).toBe(false);
      mocks.row = undefined;
      expect(await recordEspOrder(7, "PO-1")).toEqual({ ok: false, error: "Order not found." });
    });
  });

  describe("markMerchShipped", () => {
    it("marks fulfilled, stamps shippedAt, and emails carrier and tracking without ESP data", async () => {
      mocks.row = { ...paidOrder, status: "ordered_in_esp", espOrderNumber: "PO-SECRET-1" };
      const result = await markMerchShipped(7, {
        carrier: "ups",
        trackingNumber: "1Z 999 AA1 0123",
      });
      expect(result).toEqual({ ok: true, emailed: true });

      expect(mocks.updates[0]).toMatchObject({
        status: "fulfilled",
        carrier: "ups",
        trackingNumber: "1Z999AA10123",
      });
      expect(typeof mocks.updates[0].shippedAt).toBe("string");

      expect(mocks.sendMerchShippedEmail).toHaveBeenCalledTimes(1);
      const payload = mocks.sendMerchShippedEmail.mock.calls[0][0];
      expect(payload).toMatchObject({
        email: "pat@example.com",
        firstName: "Pat",
        orderId: 7,
        carrier: "ups",
        trackingNumber: "1Z999AA10123",
      });
      expect(payload.items).toEqual([{ name: "Pen", color: "Navy", quantity: 250 }]);
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toContain("PO-SECRET-1");
      expect(serialized.toLowerCase()).not.toContain("espplus");
      expect(serialized).not.toContain("OD618");
      expect(serialized).not.toContain("Prime Line");
    });

    it("refuses before payment, keeping the ESP-needs-payment rule", async () => {
      mocks.row = { ...paidOrder, status: "awaiting_payment", paidAt: undefined };
      const result = await markMerchShipped(7, { carrier: "UPS", trackingNumber: "12345" });
      expect(result.ok).toBe(false);
      expect(mocks.updates).toHaveLength(0);
      expect(mocks.sendMerchShippedEmail).not.toHaveBeenCalled();
    });

    it("refuses without an admin session", async () => {
      mocks.admin = false;
      expect(await markMerchShipped(7, { carrier: "UPS", trackingNumber: "12345" })).toEqual({
        ok: false,
        error: "Not authorized.",
      });
      expect(mocks.sendMerchShippedEmail).not.toHaveBeenCalled();
    });

    it("validates carrier and tracking number before touching anything", async () => {
      expect((await markMerchShipped(7, { carrier: "", trackingNumber: "12345" })).ok).toBe(false);
      expect((await markMerchShipped(7, { carrier: "UPS", trackingNumber: "x" })).ok).toBe(false);
      expect(mocks.updates).toHaveLength(0);
    });

    it("refuses cancelled orders and orders with no customer email", async () => {
      mocks.row = { ...paidOrder, status: "cancelled" };
      expect((await markMerchShipped(7, { carrier: "UPS", trackingNumber: "12345" })).ok).toBe(
        false
      );
      mocks.row = { ...paidOrder, email: "" };
      expect((await markMerchShipped(7, { carrier: "UPS", trackingNumber: "12345" })).ok).toBe(
        false
      );
      expect(mocks.updates).toHaveLength(0);
    });

    it("still records the shipment when the email fails, and says so", async () => {
      mocks.sendMerchShippedEmail.mockResolvedValue({ sent: false, reason: "not_configured" });
      expect(await markMerchShipped(7, { carrier: "UPS", trackingNumber: "12345" })).toEqual({
        ok: true,
        emailed: false,
      });
      expect(mocks.updates[0].status).toBe("fulfilled");
    });

    it("survives the email throwing", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.sendMerchShippedEmail.mockRejectedValue(new Error("boom"));
      expect(await markMerchShipped(7, { carrier: "UPS", trackingNumber: "12345" })).toEqual({
        ok: true,
        emailed: false,
      });
      spy.mockRestore();
    });

    it("keeps the original shippedAt when tracking is corrected and resent", async () => {
      mocks.row = { ...paidOrder, status: "fulfilled", shippedAt: "2026-10-07T10:00:00.000Z" };
      await markMerchShipped(7, { carrier: "FedEx", trackingNumber: "123456789012" });
      expect(mocks.updates[0].shippedAt).toBe("2026-10-07T10:00:00.000Z");
      expect(mocks.sendMerchShippedEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe("manual Paid status", () => {
    it("sends the receipt email once when the admin first marks an order paid", async () => {
      mocks.row = { ...paidOrder, status: "awaiting_payment", paidAt: undefined };
      expect(await updateMerchOrderStatus(7, "paid")).toEqual({ ok: true });
      expect(mocks.sendMerchPaidEmailOnce).toHaveBeenCalledTimes(1);
      expect(mocks.sendMerchPaidEmailOnce.mock.calls[0][0]).toBe(7);
      expect(mocks.updates[0]).toMatchObject({ status: "paid", paidManually: true });
    });

    it("does not email again when the order is already paid", async () => {
      expect(await updateMerchOrderStatus(7, "paid")).toEqual({ ok: true });
      expect(mocks.sendMerchPaidEmailOnce).not.toHaveBeenCalled();
    });

    it("keeps the status change even if the receipt email throws", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.row = { ...paidOrder, status: "awaiting_payment", paidAt: undefined };
      mocks.sendMerchPaidEmailOnce.mockRejectedValue(new Error("boom"));
      expect(await updateMerchOrderStatus(7, "paid")).toEqual({ ok: true });
      spy.mockRestore();
    });
  });
});
