// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  CART_FORM_LIMITS,
  CART_FORM_MESSAGES,
  fieldErrorsFromIssues,
  parseQuantityDraft,
  validateCartContact,
  type CartContactValues,
} from "@/lib/cartFormRules";
import { cartCheckoutSchema } from "@/lib/merchOrders";

const valid: CartContactValues = {
  firstName: "Pat",
  lastName: "Lee",
  email: "pat@example.com",
  phone: "5555551234",
  notes: "",
};

describe("validateCartContact", () => {
  it("accepts a complete, valid contact", () => {
    expect(validateCartContact(valid)).toEqual({});
  });

  it("rejects a 3-digit phone with the same minimum the server uses", () => {
    expect(validateCartContact({ ...valid, phone: "123" }).phone).toBe(
      CART_FORM_MESSAGES.phoneTooShort
    );
    expect(validateCartContact({ ...valid, phone: "   " }).phone).toBe(
      CART_FORM_MESSAGES.phoneRequired
    );
    expect(validateCartContact({ ...valid, phone: "1234567" }).phone).toBeUndefined();
  });

  it("reports one error per bad field", () => {
    const errors = validateCartContact({
      firstName: "",
      lastName: "",
      email: "nope",
      phone: "1",
      notes: "x".repeat(CART_FORM_LIMITS.notesMax + 1),
    });
    expect(Object.keys(errors).sort()).toEqual([
      "email",
      "firstName",
      "lastName",
      "notes",
      "phone",
    ]);
  });
});

describe("client rules agree with cartCheckoutSchema", () => {
  const items = [{ productId: "x", quantity: 6 }];
  const cases: [string, Partial<CartContactValues>][] = [
    ["valid", {}],
    ["blank first name", { firstName: "  " }],
    ["long last name", { lastName: "a".repeat(CART_FORM_LIMITS.nameMax + 1) }],
    ["name at the limit", { firstName: "a".repeat(CART_FORM_LIMITS.nameMax) }],
    ["blank email", { email: "" }],
    ["email without domain dot", { email: "pat@example" }],
    ["email with one-letter tld", { email: "pat@example.c" }],
    ["email with double dot", { email: "pat..lee@example.com" }],
    ["email with spaces", { email: "pat lee@example.com" }],
    ["plus-addressed email", { email: "pat+shop@example.co.uk" }],
    ["too-long email", { email: `${"a".repeat(CART_FORM_LIMITS.emailMax)}@example.com` }],
    ["3-digit phone", { phone: "123" }],
    ["6-char phone", { phone: "123456" }],
    ["7-char phone", { phone: "1234567" }],
    ["phone at the limit", { phone: "1".repeat(CART_FORM_LIMITS.phoneMax) }],
    ["phone over the limit", { phone: "1".repeat(CART_FORM_LIMITS.phoneMax + 1) }],
    ["long notes", { notes: "n".repeat(CART_FORM_LIMITS.notesMax + 1) }],
    ["notes at the limit", { notes: "n".repeat(CART_FORM_LIMITS.notesMax) }],
  ];

  it.each(cases)("%s", (_name, override) => {
    const values = { ...valid, ...override };
    const client = validateCartContact(values);
    const server = cartCheckoutSchema.safeParse({ ...values, items });
    const serverFields = server.success
      ? []
      : Object.keys(server.error.flatten().fieldErrors).sort();
    expect(Object.keys(client).sort()).toEqual(serverFields);
  });

  it("gives the client and the server the same message for the same field", () => {
    const values = { ...valid, phone: "123", email: "pat@example" };
    const client = validateCartContact(values);
    const server = cartCheckoutSchema.safeParse({ ...values, items });
    expect(server.success).toBe(false);
    if (server.success) return;
    const { fieldErrors } = server.error.flatten();
    expect(fieldErrors.phone?.[0]).toBe(client.phone);
    expect(fieldErrors.email?.[0]).toBe(client.email);
  });

  it("caps a line at the same quantity on both sides", () => {
    const over = cartCheckoutSchema.safeParse({
      ...valid,
      items: [{ productId: "x", quantity: CART_FORM_LIMITS.lineQuantityMax + 1 }],
    });
    expect(over.success).toBe(false);
    const atLimit = cartCheckoutSchema.safeParse({
      ...valid,
      items: [{ productId: "x", quantity: CART_FORM_LIMITS.lineQuantityMax }],
    });
    expect(atLimit.success).toBe(true);
    expect(parseQuantityDraft(String(CART_FORM_LIMITS.lineQuantityMax + 1))).toEqual({
      kind: "ok",
      value: CART_FORM_LIMITS.lineQuantityMax,
      clamped: true,
    });
  });
});

describe("fieldErrorsFromIssues", () => {
  it("reads zod flatten() output into per-field messages", () => {
    const server = cartCheckoutSchema.safeParse({ ...valid, phone: "123", items: [] });
    expect(server.success).toBe(false);
    if (server.success) return;
    const result = fieldErrorsFromIssues(server.error.flatten());
    expect(result.fields.phone).toBe(CART_FORM_MESSAGES.phoneTooShort);
    expect(result.other).toBe(CART_FORM_MESSAGES.cartEmpty);
  });

  it("is safe on anything else", () => {
    for (const input of [
      undefined,
      null,
      "x",
      5,
      {},
      { fieldErrors: "bad" },
      { fieldErrors: { phone: [] } },
    ]) {
      expect(fieldErrorsFromIssues(input)).toEqual({ fields: {} });
    }
  });

  it("ignores honeypot and captcha keys", () => {
    expect(
      fieldErrorsFromIssues({ fieldErrors: { company_website: ["bot"], turnstileToken: ["x"] } })
    ).toEqual({ fields: {} });
  });
});

describe("parseQuantityDraft", () => {
  it("keeps empty and unfinished drafts as such instead of coercing to 1", () => {
    expect(parseQuantityDraft("")).toEqual({ kind: "empty" });
    expect(parseQuantityDraft("  ")).toEqual({ kind: "empty" });
    for (const text of ["0", "-3", "2.5", "1e3", "abc"]) {
      expect(parseQuantityDraft(text)).toEqual({ kind: "invalid" });
    }
  });

  it("parses whole numbers and clamps above the max", () => {
    expect(parseQuantityDraft("72")).toEqual({ kind: "ok", value: 72, clamped: false });
    expect(parseQuantityDraft("007")).toEqual({ kind: "ok", value: 7, clamped: false });
    expect(parseQuantityDraft("100000")).toEqual({ kind: "ok", value: 100000, clamped: false });
    expect(parseQuantityDraft("9999999")).toEqual({ kind: "ok", value: 100000, clamped: true });
    expect(parseQuantityDraft("50", 10)).toEqual({ kind: "ok", value: 10, clamped: true });
  });
});
