import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => ({
  emails: [] as { to: string; subject: string; html: string }[],
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (message: { to: string; subject: string; html: string }) => {
        sent.emails.push(message);
        return { error: null };
      },
    };
  },
}));

import { createOrderToken, verifyOrderToken } from "@/lib/orderTracking";

const SECRET = "test-secret-with-enough-length-0123456789";
const SITE = "https://shop.example.com";

async function loadEmail() {
  vi.resetModules();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("CONTACT_EMAIL_FROM", "site@example.com");
  vi.stubEnv("CONTACT_EMAIL_TO", "business@example.com");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  return import("@/lib/email");
}

const lines = [{ name: "Metal Pen", color: "Navy", quantity: 250, unitPrice: 1.5, lineTotal: 375 }];

async function sendAll(email: Awaited<ReturnType<typeof loadEmail>>) {
  await email.sendMerchRequestConfirmation({
    email: "pat@example.com",
    firstName: "Pat",
    orderRef: "MG-00042",
    items: lines,
    total: 375,
  });
  await email.sendMerchPaymentLinkEmail({
    email: "pat@example.com",
    firstName: "Pat",
    orderId: 42,
    total: 412.5,
    paymentUrl: "https://square.link/u/abc",
  });
  await email.sendMerchPaidEmail({
    email: "pat@example.com",
    firstName: "Pat",
    orderId: 42,
    amountPaid: 412.5,
  });
  await email.sendMerchShippedEmail({
    email: "pat@example.com",
    firstName: "Pat",
    orderId: 42,
    carrier: "UPS",
    trackingNumber: "1Z999AA10123456784",
    items: lines,
  });
}

function linkIn(html: string): URL {
  const match = /href="([^"]*\/orders\/[^"]*)"/.exec(html);
  expect(match).not.toBeNull();
  return new URL(match![1].replace(/&amp;/g, "&"));
}

describe("track-your-order links in customer emails", () => {
  beforeEach(() => {
    sent.emails.length = 0;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("adds a working, signed link to all four emails when ORDER_LINK_SECRET is set", async () => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    await sendAll(await loadEmail());

    expect(sent.emails).toHaveLength(4);
    for (const { html } of sent.emails) {
      expect(html).toContain("Track your order");
      const url = linkIn(html);
      expect(url.origin).toBe(SITE);
      expect(url.pathname).toBe("/orders/MG-00042");
      expect(url.searchParams.get("t")).toBe(createOrderToken(42));
      expect(verifyOrderToken(42, url.searchParams.get("t"))).toBe(true);
    }
  });

  it("derives the order id from the confirmation email's reference", async () => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    const email = await loadEmail();
    await email.sendMerchRequestConfirmation({
      email: "pat@example.com",
      firstName: "Pat",
      orderRef: "MG-00007",
      items: lines,
      total: 375,
    });
    expect(linkIn(sent.emails[0].html).pathname).toBe("/orders/MG-00007");
  });

  it("keeps the shipped email's package-tracking button alongside the order link", async () => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    await sendAll(await loadEmail());
    const shipped = sent.emails[3].html;
    expect(shipped).toContain("Track Your Package");
    expect(shipped).toContain("https://www.ups.com/track?tracknum=1Z999AA10123456784");
    expect(shipped).toContain("Track your order");
  });

  it("keeps the pay button in the payment-link email", async () => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    await sendAll(await loadEmail());
    expect(sent.emails[1].html).toContain("https://square.link/u/abc");
    expect(sent.emails[1].html).toContain("Pay Securely Online");
  });

  it.each([undefined, "", "   ", "too-short"])(
    "adds no link when ORDER_LINK_SECRET is %j, and the emails are otherwise intact",
    async (secret) => {
      vi.stubEnv("ORDER_LINK_SECRET", secret as string);
      await sendAll(await loadEmail());
      expect(sent.emails).toHaveLength(4);
      for (const { html } of sent.emails) {
        expect(html).not.toContain("Track your order");
        expect(html).not.toContain("/orders/");
        expect(html).toContain("MG-00042");
      }
    }
  );

  it("skips the link when the confirmation has no order reference or an unusable one", async () => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    const email = await loadEmail();
    for (const orderRef of [undefined, "", "not-a-ref", "MG-99999999999999999999"]) {
      await email.sendMerchRequestConfirmation({
        email: "pat@example.com",
        firstName: "Pat",
        orderRef,
        items: lines,
        total: 375,
      });
    }
    expect(sent.emails).toHaveLength(4);
    for (const { html } of sent.emails) expect(html).not.toContain("/orders/");
  });

  it("never puts the secret in an email", async () => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    await sendAll(await loadEmail());
    for (const { html } of sent.emails) expect(html).not.toContain(SECRET);
  });
});
