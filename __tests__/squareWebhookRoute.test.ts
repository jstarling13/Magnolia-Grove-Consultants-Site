// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ syncAll: vi.fn() }));
vi.mock("@/lib/merchPayments", () => ({ syncAllAwaitingMerchPayments: mocks.syncAll }));

import { POST } from "@/app/api/webhooks/square/route";
import { computeSquareSignature, MAX_WEBHOOK_BODY_BYTES } from "@/lib/squareWebhook";
import { middleware, config } from "@/middleware";

const KEY = "route-test-key";
const URL_ = "https://example.test/api/webhooks/square";

function event(type: string) {
  return JSON.stringify({ type, event_id: "evt_1", data: { id: "x" } });
}

function request(body: string, signature?: string | null) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature !== null) {
    headers["x-square-hmacsha256-signature"] = signature ?? computeSquareSignature(KEY, URL_, body);
  }
  return new NextRequest(URL_, { method: "POST", body, headers });
}

describe("POST /api/webhooks/square", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = KEY;
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = URL_;
    mocks.syncAll.mockResolvedValue(1);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  });

  it.each(["payment.updated", "payment.created", "order.updated", "order.fulfillment.updated"])(
    "triggers the sync for %s",
    async (type) => {
      const res = await POST(request(event(type)));
      expect(res.status).toBe(200);
      expect(mocks.syncAll).toHaveBeenCalledTimes(1);
    }
  );

  it("returns 200 without syncing for ignored event types", async () => {
    for (const type of ["customer.created", "refund.updated", "inventory.count.updated"]) {
      const res = await POST(request(event(type)));
      expect(res.status).toBe(200);
    }
    expect(mocks.syncAll).not.toHaveBeenCalled();
  });

  it("returns 200 even when the sync finds nothing", async () => {
    mocks.syncAll.mockResolvedValue(0);
    expect((await POST(request(event("payment.updated")))).status).toBe(200);
  });

  it("returns 403 with no detail for a bad signature and never syncs", async () => {
    const res = await POST(request(event("payment.updated"), "bm90LXRoZS1zaWduYXR1cmU="));
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("");
    expect(mocks.syncAll).not.toHaveBeenCalled();
  });

  it("returns 403 for a missing signature header", async () => {
    const res = await POST(request(event("payment.updated"), null));
    expect(res.status).toBe(403);
    expect(mocks.syncAll).not.toHaveBeenCalled();
  });

  it("returns 403 when the body was altered after signing", async () => {
    const signed = computeSquareSignature(KEY, URL_, event("customer.created"));
    const res = await POST(request(event("payment.updated"), signed));
    expect(res.status).toBe(403);
    expect(mocks.syncAll).not.toHaveBeenCalled();
  });

  it("returns 503 and never processes when the key is missing", async () => {
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const res = await POST(request(event("payment.updated")));
    expect(res.status).toBe(503);
    expect(mocks.syncAll).not.toHaveBeenCalled();
  });

  it("returns 503 and never processes when the notification URL is missing", async () => {
    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
    const res = await POST(request(event("payment.updated")));
    expect(res.status).toBe(503);
    expect(mocks.syncAll).not.toHaveBeenCalled();
  });

  it("returns 413 for an oversized body", async () => {
    const big = JSON.stringify({
      type: "payment.updated",
      pad: "a".repeat(MAX_WEBHOOK_BODY_BYTES),
    });
    const res = await POST(request(big));
    expect(res.status).toBe(413);
    expect(mocks.syncAll).not.toHaveBeenCalled();
  });

  it("returns 400 for a validly signed body that is not JSON", async () => {
    const res = await POST(request("not json"));
    expect(res.status).toBe(400);
    expect(mocks.syncAll).not.toHaveBeenCalled();
  });

  it("returns 500 when the sync throws so Square retries", async () => {
    mocks.syncAll.mockRejectedValue(new Error("db down"));
    const res = await POST(request(event("payment.updated")));
    expect(res.status).toBe(500);
  });

  it("does not log the signature key or raw body", async () => {
    await POST(request(event("payment.updated")));
    await POST(request(event("payment.updated"), "bad"));
    const logged = JSON.stringify([
      (console.info as ReturnType<typeof vi.fn>).mock.calls,
      (console.warn as ReturnType<typeof vi.fn>).mock.calls,
      (console.error as ReturnType<typeof vi.fn>).mock.calls,
    ]);
    expect(logged).not.toContain(KEY);
    expect(logged).not.toContain("evt_1");
  });
});

describe("middleware and the webhook path", () => {
  it("only matches /admin and /account, not /api/webhooks", () => {
    const matchers = config.matcher as string[];
    expect(matchers.every((m) => m.startsWith("/admin") || m.startsWith("/account"))).toBe(true);
  });

  it("lets /api/webhooks/square through even if invoked, with no redirect", () => {
    const res = middleware(new NextRequest(URL_, { method: "POST" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
