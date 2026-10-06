// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  verifyTurnstileToken: vi.fn(),
  recordSubmission: vi.fn(),
  createPaymentLink: vi.fn(),
  sendPaymentRequestNotification: vi.fn(),
  sendLeadNotification: vi.fn(),
  sendLeadAutoResponder: vi.fn(),
  sendStrategySessionNotification: vi.fn(),
  sendStrategySessionAutoResponder: vi.fn(),
  sendMerchOrderNotification: vi.fn(),
  sendCartOrderNotification: vi.fn(),
  sendMerchRequestConfirmation: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken: mocks.verifyTurnstileToken }));
vi.mock("@/lib/submissions", () => ({ recordSubmission: mocks.recordSubmission }));
vi.mock("@/lib/square", () => ({ createPaymentLink: mocks.createPaymentLink }));
vi.mock("@/lib/email", () => ({
  sendPaymentRequestNotification: mocks.sendPaymentRequestNotification,
  sendLeadNotification: mocks.sendLeadNotification,
  sendLeadAutoResponder: mocks.sendLeadAutoResponder,
  sendStrategySessionNotification: mocks.sendStrategySessionNotification,
  sendStrategySessionAutoResponder: mocks.sendStrategySessionAutoResponder,
  sendMerchOrderNotification: mocks.sendMerchOrderNotification,
  sendCartOrderNotification: mocks.sendCartOrderNotification,
  sendMerchRequestConfirmation: mocks.sendMerchRequestConfirmation,
}));

import { POST as checkout } from "@/app/api/checkout/route";
import { POST as contact } from "@/app/api/contact/route";
import { POST as orderRequest } from "@/app/api/merchant/order-request/route";
import { POST as cartCheckout } from "@/app/api/merchant/cart-checkout/route";

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-real-ip": "9.9.9.9", ...headers },
  });
}

const payment = {
  organizationName: "Acme PAC",
  firstName: "Pat",
  lastName: "Lee",
  email: "Pat@Example.com",
  memo: "Invoice 42",
  amount: 250,
};
const lead = {
  formType: "lead",
  firstName: "Pat",
  lastName: "Lee",
  email: "pat@example.com",
  phone: "5555551234",
  service: "Campaign",
  message: "Hello",
  turnstileToken: "tok",
  company_website: "",
};
const merchReq = {
  firstName: "Pat",
  lastName: "Lee",
  email: "pat@example.com",
  phone: "5555551234",
  product: "Pens",
  quantity: "500",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockResolvedValue({ success: true });
  mocks.verifyTurnstileToken.mockResolvedValue(true);
  mocks.recordSubmission.mockResolvedValue(1);
  mocks.createPaymentLink.mockResolvedValue({ url: "https://square.link/u/abc", id: "pl_1" });
  mocks.sendPaymentRequestNotification.mockResolvedValue({ sent: true });
  mocks.sendLeadNotification.mockResolvedValue({ sent: true });
  mocks.sendLeadAutoResponder.mockResolvedValue({ sent: true });
  mocks.sendMerchOrderNotification.mockResolvedValue({ sent: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/checkout (creates Square links)", () => {
  it("creates one link on the happy path", async () => {
    const res = await checkout(post("/api/checkout", payment));
    expect(res.status).toBe(200);
    expect(mocks.createPaymentLink).toHaveBeenCalledTimes(1);
    expect(mocks.createPaymentLink.mock.calls[0][0].amountCents).toBe(25000);
  });

  describe("Turnstile bot check", () => {
    it("verifies the submitted token against the caller's IP and never stores it", async () => {
      const res = await checkout(post("/api/checkout", { ...payment, turnstileToken: "tok-123" }));
      expect(res.status).toBe(200);
      expect(mocks.verifyTurnstileToken).toHaveBeenCalledWith("tok-123", "9.9.9.9");
      expect(mocks.recordSubmission.mock.calls[0][1]).not.toHaveProperty("turnstileToken");
    });

    it("400s, creates no link and spends no per-email or global budget when verification fails", async () => {
      mocks.verifyTurnstileToken.mockResolvedValue(false);
      const res = await checkout(post("/api/checkout", { ...payment, turnstileToken: "bad" }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({
        success: false,
        error: expect.stringMatching(/captcha/i),
      });
      expect(mocks.createPaymentLink).not.toHaveBeenCalled();
      expect(mocks.recordSubmission).not.toHaveBeenCalled();
      expect(mocks.sendPaymentRequestNotification).not.toHaveBeenCalled();
      expect(mocks.checkRateLimit).toHaveBeenCalledTimes(1); // the IP ceiling still applies
    });

    it("passes undefined (not a non-string) when the token is missing or malformed", async () => {
      await checkout(post("/api/checkout", payment));
      await checkout(post("/api/checkout", { ...payment, turnstileToken: { evil: true } }));
      expect(mocks.verifyTurnstileToken.mock.calls.map((c) => c[0])).toEqual([
        undefined,
        undefined,
      ]);
    });
  });

  it("applies per-IP, per-email (case-insensitive) and site-wide limits", async () => {
    await checkout(post("/api/checkout", payment));
    const keys = mocks.checkRateLimit.mock.calls.map((c) => c[0]);
    expect(keys).toEqual([
      "checkout-ip:9.9.9.9",
      "checkout-email:pat@example.com",
      "checkout-global",
    ]);
  });

  it.each([
    ["ip", 0],
    ["email", 1],
    ["global", 2],
  ])("429s and creates no link when the %s limit is hit", async (_name, index) => {
    let call = 0;
    mocks.checkRateLimit.mockImplementation(async () => ({ success: call++ !== index }));
    const res = await checkout(post("/api/checkout", payment));
    expect(res.status).toBe(429);
    expect(mocks.createPaymentLink).not.toHaveBeenCalled();
    expect(mocks.sendPaymentRequestNotification).not.toHaveBeenCalled();
  });

  it("does not spend the per-email or global budget on invalid or honeypot requests", async () => {
    await checkout(post("/api/checkout", { ...payment, amount: -5 }));
    await checkout(post("/api/checkout", { ...payment, company_website: "bot" }));
    expect(mocks.checkRateLimit).toHaveBeenCalledTimes(2); // IP only, both times
    expect(mocks.createPaymentLink).not.toHaveBeenCalled();
  });

  it.each([
    ["negative", { amount: -1 }],
    ["zero", { amount: 0 }],
    ["sub-cent", { amount: 0.001 }],
    ["above cap", { amount: 1_000_001 }],
    ["non-numeric", { amount: "abc" }],
    ["infinite", { amount: "Infinity" }],
    ["huge memo", { memo: "m".repeat(301) }],
    ["bad email", { email: "nope" }],
  ])("rejects an invalid %s with 400 and creates nothing", async (_n, override) => {
    const res = await checkout(post("/api/checkout", { ...payment, ...override }));
    expect(res.status).toBe(400);
    expect(mocks.createPaymentLink).not.toHaveBeenCalled();
  });

  it("413 for an oversized body, 400 for malformed JSON", async () => {
    expect(
      (await checkout(post("/api/checkout", { ...payment, memo: "x".repeat(200_000) }))).status
    ).toBe(413);
    expect((await checkout(post("/api/checkout", "{nope"))).status).toBe(400);
    expect(mocks.createPaymentLink).not.toHaveBeenCalled();
  });

  it("503 with a customer-safe message when Square fails, no internals", async () => {
    mocks.createPaymentLink.mockResolvedValue({ url: null, error: "square_api_error" });
    const res = await checkout(post("/api/checkout", payment));
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toMatch(/square_api_error|stack|Error:/i);
  });

  it("a thrown error becomes a generic 500", async () => {
    mocks.createPaymentLink.mockRejectedValue(new Error("ECONNRESET 10.1.2.3 token=abc"));
    const res = await checkout(post("/api/checkout", payment));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("10.1.2.3");
  });
});

describe("POST /api/contact", () => {
  it("limits per IP and per target email, and strips bot-protection fields before storing", async () => {
    const res = await contact(post("/api/contact", lead));
    expect(res.status).toBe(200);
    expect(mocks.checkRateLimit.mock.calls.map((c) => c[0])).toEqual([
      "9.9.9.9",
      "contact-email:pat@example.com",
    ]);
    const stored = mocks.recordSubmission.mock.calls[0][1];
    expect(stored).not.toHaveProperty("turnstileToken");
    expect(stored).not.toHaveProperty("company_website");
    expect(stored.firstName).toBe("Pat");
  });

  it("will not send the auto-responder once an address has been targeted too often", async () => {
    mocks.checkRateLimit
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, retryAfterSeconds: 99 });
    const res = await contact(post("/api/contact", lead));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("99");
    expect(mocks.sendLeadAutoResponder).not.toHaveBeenCalled();
    expect(mocks.recordSubmission).not.toHaveBeenCalled();
  });

  it("rejects overlong select-style fields and oversized bodies", async () => {
    expect(
      (await contact(post("/api/contact", { ...lead, service: "s".repeat(300) }))).status
    ).toBe(400);
    expect(
      (await contact(post("/api/contact", { ...lead, message: "m".repeat(200_000) }))).status
    ).toBe(413);
    expect((await contact(post("/api/contact", "[1,2"))).status).toBe(400);
    expect(mocks.sendLeadNotification).not.toHaveBeenCalled();
  });

  it("answers a generic 500 when email sending throws", async () => {
    mocks.sendLeadNotification.mockRejectedValue(new Error("resend key re_abc123 invalid"));
    const res = await contact(post("/api/contact", lead));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("re_abc123");
  });
});

describe("POST /api/merchant/order-request", () => {
  it("is rate limited, size limited and validated", async () => {
    expect((await orderRequest(post("/api/merchant/order-request", merchReq))).status).toBe(200);
    expect(
      (
        await orderRequest(
          post("/api/merchant/order-request", { ...merchReq, notes: "n".repeat(5000) })
        )
      ).status
    ).toBe(400);
    expect(
      (
        await orderRequest(
          post("/api/merchant/order-request", { ...merchReq, notes: "n".repeat(200_000) })
        )
      ).status
    ).toBe(413);
    mocks.checkRateLimit.mockResolvedValue({ success: false });
    expect((await orderRequest(post("/api/merchant/order-request", merchReq))).status).toBe(429);
  });
});

describe("POST /api/merchant/cart-checkout input limits", () => {
  const cart = (items: unknown[]) => ({
    firstName: "Pat",
    lastName: "Lee",
    email: "pat@example.com",
    phone: "5555551234",
    items,
  });

  it("rejects an absurd number of lines before doing any catalog work", async () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ productId: `p${i}`, quantity: 1 }));
    const res = await cartCheckout(post("/api/merchant/cart-checkout", cart(items)));
    expect(res.status).toBe(400);
    expect(mocks.recordSubmission).not.toHaveBeenCalled();
  });

  it("413 for a megabyte body, 400 for malformed JSON, 400 for wrong types", async () => {
    const huge = Array.from({ length: 30_000 }, () => ({ productId: "x", quantity: 1 }));
    expect((await cartCheckout(post("/api/merchant/cart-checkout", cart(huge)))).status).toBe(413);
    expect((await cartCheckout(post("/api/merchant/cart-checkout", "not json"))).status).toBe(400);
    expect(
      (await cartCheckout(post("/api/merchant/cart-checkout", cart("nope" as never)))).status
    ).toBe(400);
    expect(
      (
        await cartCheckout(
          post("/api/merchant/cart-checkout", cart([{ productId: "x", quantity: -3 }]))
        )
      ).status
    ).toBe(400);
    expect(mocks.recordSubmission).not.toHaveBeenCalled();
  });

  it("limits confirmation emails per target address, but only after the cart validated", async () => {
    mocks.checkRateLimit
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false });
    const res = await cartCheckout(
      post(
        "/api/merchant/cart-checkout",
        cart([{ productId: "peter-millar-galway-stretch-vest", color: "Black", quantity: 12 }])
      )
    );
    expect(res.status).toBe(429);
    expect(mocks.checkRateLimit.mock.calls[1][0]).toBe("cart-email:pat@example.com");
    expect(mocks.recordSubmission).not.toHaveBeenCalled();
    expect(mocks.sendMerchRequestConfirmation).not.toHaveBeenCalled();
  });
});
