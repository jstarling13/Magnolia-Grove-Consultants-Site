// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ syncAll: vi.fn() }));
vi.mock("@/lib/merchPayments", () => ({ syncAllAwaitingMerchPayments: mocks.syncAll }));

import { POST } from "@/app/api/webhooks/square/route";
import { computeSquareSignature, MAX_WEBHOOK_BODY_BYTES } from "@/lib/squareWebhook";

const KEY = "route-test-key";
const URL_ = "https://example.test/api/webhooks/square";

function signed(body: string) {
  return new NextRequest(URL_, {
    method: "POST",
    body,
    headers: { "x-square-hmacsha256-signature": computeSquareSignature(KEY, URL_, body) },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = KEY;
  process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = URL_;
  mocks.syncAll.mockResolvedValue(0);
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
});

describe("webhook with validly signed but odd bodies", () => {
  it.each(["null", "[]", '"a string"', "42", "{}", '{"type":123}', '{"type":null}'])(
    "does not crash or sync for body %s",
    async (body) => {
      const res = await POST(signed(body));
      // Either rejected as malformed (400) or ignored (200); never a 5xx, never a sync.
      expect([200, 400]).toContain(res.status);
      expect(mocks.syncAll).not.toHaveBeenCalled();
    }
  );

  it("an empty body is rejected, not processed", async () => {
    const res = await POST(signed(""));
    expect(res.status).toBe(400);
    expect(mocks.syncAll).not.toHaveBeenCalled();
  });

  it("rejects an oversized body even when it declares a small content-length", async () => {
    const body = "a".repeat(MAX_WEBHOOK_BODY_BYTES + 1);
    const res = await POST(
      new NextRequest(URL_, {
        method: "POST",
        body,
        headers: { "x-square-hmacsha256-signature": "x", "content-length": "5" },
      })
    );
    expect(res.status).toBe(413);
  });

  it("non-POST methods are not exposed", async () => {
    const mod = await import("@/app/api/webhooks/square/route");
    expect((mod as Record<string, unknown>).GET).toBeUndefined();
  });
});
