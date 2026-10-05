// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: false, queries: [] as string[] }));

vi.mock("@/lib/db", () => ({
  sql: async (strings: TemplateStringsArray) => {
    mocks.queries.push(strings.join("?"));
    return [];
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
vi.mock("@/lib/adminAuth", () => ({
  ADMIN_SESSION_COOKIE: "admin",
  verifySessionToken: () => (mocks.admin ? { username: "ben" } : null),
}));
vi.mock("@/lib/square", () => ({ createPaymentLink: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendMerchPaymentLinkEmail: vi.fn(),
  sendMerchShippedEmail: vi.fn(),
}));
vi.mock("@/lib/merchPayments", () => ({ sendMerchPaidEmailOnce: vi.fn() }));

import {
  addDeliverable,
  deleteDeliverable,
  markMerchShipped,
  markSubmissionRead,
  recordEspOrder,
  sendMerchPaymentLink,
  updateMerchOrderStatus,
} from "@/app/admin/actions";

beforeEach(() => {
  mocks.queries.length = 0;
  mocks.admin = false;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("server actions re-check the admin session", () => {
  it("markSubmissionRead does nothing without a session", async () => {
    await markSubmissionRead(5);
    expect(mocks.queries).toHaveLength(0);
  });

  it("markSubmissionRead updates with a session", async () => {
    mocks.admin = true;
    await markSubmissionRead(5);
    expect(mocks.queries).toHaveLength(1);
    expect(mocks.queries[0]).toContain("UPDATE submissions SET read_at");
  });

  it("markSubmissionRead ignores non-integer ids even for admins", async () => {
    mocks.admin = true;
    await markSubmissionRead(Number.NaN);
    await markSubmissionRead(-1);
    await markSubmissionRead(1.5);
    expect(mocks.queries).toHaveLength(0);
  });

  it("the deliverable stubs are refused without a session", async () => {
    expect(await addDeliverable(1, "lead", "label", "https://x.test")).toEqual({
      ok: false,
      error: "Not authorized.",
    });
    await expect(deleteDeliverable(1)).resolves.toBeUndefined();
  });

  it("the deliverable stubs keep their existing behavior for admins", async () => {
    mocks.admin = true;
    expect(await addDeliverable(1, "lead", "label", "https://x.test")).toEqual({
      ok: false,
      error: "Deliverables aren't available yet.",
    });
  });

  it("every money- or email-moving action still refuses without a session and never touches the database", async () => {
    expect(await updateMerchOrderStatus(1, "paid")).toEqual({
      ok: false,
      error: "Not authorized.",
    });
    expect(await sendMerchPaymentLink(1, 100)).toEqual({ ok: false, error: "Not authorized." });
    expect(await recordEspOrder(1, "ESP-1")).toEqual({ ok: false, error: "Not authorized." });
    expect(
      await markMerchShipped(1, { carrier: "UPS", trackingNumber: "1Z999AA10123456784" })
    ).toEqual({ ok: false, error: "Not authorized." });
    expect(mocks.queries).toHaveLength(0);
  });
});
