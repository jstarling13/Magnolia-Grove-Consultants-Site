// @vitest-environment node
/**
 * /api/checkout with the REAL turnstile module (publicRoutesHardening mocks it):
 * enforced when TURNSTILE_SECRET_KEY is set, skipped when it is not.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createPaymentLink: vi.fn(),
  siteverify: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({ checkRateLimit: async () => ({ success: true }) }));
vi.mock("@/lib/square", () => ({ createPaymentLink: mocks.createPaymentLink }));
vi.mock("@/lib/submissions", () => ({ recordSubmission: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendPaymentRequestNotification: vi.fn().mockResolvedValue({ sent: true }),
}));

const body = {
  organizationName: "Acme PAC",
  firstName: "Pat",
  lastName: "Lee",
  email: "pat@example.com",
  memo: "Invoice 42",
  amount: 250,
};

function req(extra: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/checkout", {
    method: "POST",
    body: JSON.stringify({ ...body, ...extra }),
    headers: { "content-type": "application/json", "x-real-ip": "9.9.9.9" },
  });
}

async function loadRoute(secret: string | undefined) {
  vi.resetModules();
  vi.stubEnv("TURNSTILE_SECRET_KEY", secret);
  return (await import("@/app/api/checkout/route")).POST;
}

beforeEach(() => {
  mocks.createPaymentLink.mockResolvedValue({ url: "https://square.test/pay/1", id: "L1" });
  mocks.siteverify.mockImplementation(async (_url: unknown, init: RequestInit) => {
    const params = init.body as URLSearchParams;
    return new Response(JSON.stringify({ success: params.get("response") === "good" }));
  });
  vi.stubGlobal("fetch", mocks.siteverify);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("POST /api/checkout bot check", () => {
  it("rejects a request with no token when the secret is configured", async () => {
    const POST = await loadRoute("test-secret");
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(mocks.createPaymentLink).not.toHaveBeenCalled();
    expect(mocks.siteverify).not.toHaveBeenCalled(); // no token, nothing to verify
  });

  it("rejects a token Cloudflare says is invalid", async () => {
    const POST = await loadRoute("test-secret");
    const res = await POST(req({ turnstileToken: "bad" }));
    expect(res.status).toBe(400);
    expect(mocks.createPaymentLink).not.toHaveBeenCalled();
  });

  it("accepts a valid token", async () => {
    const POST = await loadRoute("test-secret");
    const res = await POST(req({ turnstileToken: "good" }));
    expect(res.status).toBe(200);
    expect(mocks.createPaymentLink).toHaveBeenCalledTimes(1);
  });

  it("is not enforced when no secret is configured (local dev)", async () => {
    const POST = await loadRoute(undefined);
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mocks.siteverify).not.toHaveBeenCalled();
  });
});
