// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  verifyTurnstileToken: vi.fn(),
  recordSubmission: vi.fn(),
  sendCartOrderNotification: vi.fn(),
  sendMerchRequestConfirmation: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken: mocks.verifyTurnstileToken }));
vi.mock("@/lib/submissions", () => ({ recordSubmission: mocks.recordSubmission }));
vi.mock("@/lib/email", () => ({
  sendCartOrderNotification: mocks.sendCartOrderNotification,
  sendMerchRequestConfirmation: mocks.sendMerchRequestConfirmation,
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/merchant/cart-checkout/route";
import { CART_FORM_MESSAGES, fieldErrorsFromIssues } from "@/lib/cartFormRules";

const contact = {
  firstName: "Pat",
  lastName: "Lee",
  email: "pat@example.com",
  phone: "5555551234",
  notes: "",
};

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/merchant/cart-checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify({
        items: [{ productId: "peter-millar-galway-stretch-vest", color: "Navy", quantity: 6 }],
        ...contact,
        ...body,
      }),
    })
  );
}

describe("cart-checkout validation errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.verifyTurnstileToken.mockResolvedValue(true);
  });

  it("returns issues.fieldErrors naming the phone field for a 3-digit phone", async () => {
    const response = await post({ phone: "123" });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.issues.fieldErrors.phone).toContain(CART_FORM_MESSAGES.phoneTooShort);
    // The browser turns that into a message on the phone field.
    expect(fieldErrorsFromIssues(body.issues).fields).toEqual({
      phone: CART_FORM_MESSAGES.phoneTooShort,
    });
    expect(mocks.recordSubmission).not.toHaveBeenCalled();
  });

  it("maps several bad fields at once", async () => {
    const response = await post({ firstName: "", email: "nope", phone: "" });
    expect(response.status).toBe(400);
    const { fields } = fieldErrorsFromIssues((await response.json()).issues);
    expect(Object.keys(fields).sort()).toEqual(["email", "firstName", "phone"]);
    expect(fields.phone).toBe(CART_FORM_MESSAGES.phoneRequired);
    expect(fields.email).toBe(CART_FORM_MESSAGES.emailInvalid);
  });

  it("explains a quantity over the line limit instead of a bare number error", async () => {
    const response = await post({
      items: [{ productId: "peter-millar-galway-stretch-vest", color: "Navy", quantity: 100001 }],
    });
    expect(response.status).toBe(400);
    const { other } = fieldErrorsFromIssues((await response.json()).issues);
    expect(other).toBe(CART_FORM_MESSAGES.quantityMax);
  });

  it("explains an empty cart", async () => {
    const response = await post({ items: [] });
    expect(response.status).toBe(400);
    expect(fieldErrorsFromIssues((await response.json()).issues).other).toBe(
      CART_FORM_MESSAGES.cartEmpty
    );
  });
});
