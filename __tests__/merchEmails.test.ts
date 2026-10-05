import { beforeEach, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => ({
  emails: [] as { to: string; replyTo?: string; subject: string; html: string }[],
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (message: { to: string; replyTo?: string; subject: string; html: string }) => {
        sent.emails.push(message);
        return { error: null };
      },
    };
  },
}));

import {
  buildMerchPaidEmail,
  buildMerchRequestConfirmationEmail,
  buildMerchShippedEmail,
  type CustomerOrderLine,
} from "@/lib/email";
import {
  buildTrackingUrl,
  formatOrderReference,
  parseEspOrderNumber,
  parseShipment,
  recognizeCarrier,
} from "@/lib/merchOrders";

const HOSTILE = `<script>alert("x")</script> & "Bobby" <b>`;
const ESCAPED =
  "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &quot;Bobby&quot; &lt;b&gt;";

// Stored lines carry backend-only fields; builders must never echo them.
const storedLines = [
  {
    productId: "pen",
    name: `Metal ${HOSTILE} Pen`,
    color: `Navy ${HOSTILE}`,
    quantity: 250,
    unitPrice: 1.5,
    lineTotal: 375,
    espUrl: "https://espplus.com/products/555990121",
    espKind: "product",
    supplier: "Prime Line Supplier Co",
    productNo: "OD618",
    asi: "ASI-77777",
  },
  { productId: "mug", name: "Travel Mug", quantity: 100, unitPrice: 4.25, lineTotal: 425 },
] as unknown as CustomerOrderLine[];

function expectNoBackendData(html: string) {
  const lower = html.toLowerCase();
  expect(lower).not.toContain("espplus");
  expect(lower).not.toContain("prime line supplier");
  expect(lower).not.toContain("supplier:");
  expect(html).not.toContain("OD618");
  expect(html).not.toContain("ASI-77777");
  expect(lower).not.toContain("productno");
  expect(lower).not.toContain("esporder");
  expect(lower).not.toContain("esp-ord");
}

function expectNoRawHostile(html: string) {
  expect(html).not.toContain("<script>");
  expect(html).not.toContain('alert("x")');
  expect(html).not.toContain("<b>");
}

describe("formatOrderReference", () => {
  it("pads the submission id", () => {
    expect(formatOrderReference(7)).toBe("MG-00007");
    expect(formatOrderReference(42)).toBe("MG-00042");
    expect(formatOrderReference(123456)).toBe("MG-123456");
  });
});

describe("buildMerchRequestConfirmationEmail", () => {
  const build = (over: object = {}) =>
    buildMerchRequestConfirmationEmail({
      email: "pat@example.com",
      firstName: HOSTILE,
      orderRef: "MG-00042",
      items: storedLines,
      total: 800,
      notes: `Need by Friday ${HOSTILE}\nsecond line`,
      ...over,
    });

  it("puts the reference in the subject and body", () => {
    const { subject, html } = build();
    expect(subject).toBe("We received your merchandise request — MG-00042");
    expect(html).toContain("MG-00042");
  });

  it("itemizes each line with color, quantity, unit price and line total", () => {
    const { html } = build();
    expect(html).toContain(`Metal ${ESCAPED} Pen`);
    expect(html).toContain(`Navy ${ESCAPED}`);
    expect(html).toContain("Travel Mug");
    expect(html).toContain("$1.50");
    expect(html).toContain("$375.00");
    expect(html).toContain("$4.25");
    expect(html).toContain("$425.00");
    expect(html).toContain(">250<");
    expect(html).toContain(">100<");
  });

  it("states the estimated subtotal and that nothing has been charged", () => {
    const { html } = build();
    expect(html).toContain("$800.00");
    expect(html).toContain("Estimated Subtotal");
    expect(html).toContain("Nothing has been charged");
  });

  it("explains what happens next", () => {
    const { html } = build();
    expect(html).toContain("decoration, shipping, and sales tax");
    expect(html).toContain("final quote with a secure link to pay");
    expect(html).toContain("after your payment clears");
  });

  it("escapes names, notes, product names and colors, keeping note line breaks", () => {
    const { html } = build();
    expectNoRawHostile(html);
    expect(html).toContain(`Hi ${ESCAPED},`);
    expect(html).toContain(`Need by Friday ${ESCAPED}<br/>second line`);
  });

  it("never includes ESP, supplier, product number or order-number data", () => {
    expectNoBackendData(build().html);
  });

  it("omits the reference gracefully when the order could not be saved", () => {
    const { subject, html } = build({ orderRef: undefined });
    expect(subject).toBe("We received your merchandise request");
    expect(html).not.toContain("Order Reference");
    expect(html).not.toContain("MG-");
  });

  it("omits the notes row when there are no notes", () => {
    expect(build({ notes: "  " }).html).not.toContain("Your Notes");
  });

  it("falls back to a neutral greeting for an empty name", () => {
    expect(build({ firstName: "" }).html).toContain("Hi there,");
  });
});

describe("buildMerchPaidEmail", () => {
  it("shows the amount paid, the reference, and what happens now", () => {
    const { subject, html } = buildMerchPaidEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 42,
      amountPaid: 912.5,
    });
    expect(subject).toBe("Payment received — MG-00042");
    expect(html).toContain("$912.50");
    expect(html).toContain("Amount Paid");
    expect(html).toContain("MG-00042");
    expect(html).toContain("placing your order with our supplier now");
    expectNoBackendData(html);
  });

  it("does not invent an amount when none is on record", () => {
    const { html } = buildMerchPaidEmail({ email: "a@b.co", firstName: "Pat", orderId: 3 });
    expect(html).not.toContain("Amount Paid");
    expect(html).not.toContain("$");
  });

  it("escapes the first name", () => {
    const { html } = buildMerchPaidEmail({ email: "a@b.co", firstName: HOSTILE, orderId: 3 });
    expectNoRawHostile(html);
    expect(html).toContain(ESCAPED);
  });
});

describe("buildMerchShippedEmail", () => {
  const build = (over: object = {}) =>
    buildMerchShippedEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 42,
      carrier: "ups",
      trackingNumber: "1Z999AA10123456784",
      items: storedLines,
      ...over,
    });

  it("shows carrier, tracking number and a tracking link for a recognized carrier", () => {
    const { subject, html } = build();
    expect(subject).toBe("Your order has shipped — MG-00042");
    expect(html).toContain("MG-00042");
    expect(html).toContain("UPS");
    expect(html).toContain("1Z999AA10123456784");
    expect(html).toContain('href="https://www.ups.com/track?tracknum=1Z999AA10123456784"');
  });

  it("shows the number without a link for an unrecognized carrier", () => {
    const { html } = build({ carrier: "Joe's Courier", trackingNumber: "ABC-12345" });
    expect(html).toContain("Joe's Courier");
    expect(html).toContain("ABC-12345");
    expect(html).not.toContain("<a ");
  });

  it("lists what shipped without prices or backend fields", () => {
    const { html } = build();
    expect(html).toContain(`Metal ${ESCAPED} Pen`);
    expect(html).toContain("Travel Mug");
    expect(html).not.toContain("$");
    expectNoBackendData(html);
  });

  it("escapes hostile names, carriers and tracking numbers", () => {
    const { html } = build({ firstName: HOSTILE, carrier: HOSTILE, trackingNumber: HOSTILE });
    expectNoRawHostile(html);
    expect(html).toContain(ESCAPED);
  });

  it("works without an item list", () => {
    const { html } = build({ items: undefined });
    expect(html).not.toContain("<table");
  });
});

describe("tracking links", () => {
  it("recognizes common carriers case-insensitively and by long name", () => {
    expect(recognizeCarrier("UPS")).toBe("UPS");
    expect(recognizeCarrier(" fedex ")).toBe("FedEx");
    expect(recognizeCarrier("Federal Express")).toBe("FedEx");
    expect(recognizeCarrier("U.S.P.S.")).toBe("USPS");
    expect(recognizeCarrier("DHL Express")).toBe("DHL");
    expect(recognizeCarrier("Bob's Trucking")).toBeUndefined();
    expect(recognizeCarrier("")).toBeUndefined();
  });

  it("builds a public tracking URL per carrier", () => {
    expect(buildTrackingUrl("UPS", "1Z999AA10123456784")).toBe(
      "https://www.ups.com/track?tracknum=1Z999AA10123456784"
    );
    expect(buildTrackingUrl("FedEx", "123456789012")).toBe(
      "https://www.fedex.com/fedextrack/?trknbr=123456789012"
    );
    expect(buildTrackingUrl("USPS", "9400111899223856928499")).toBe(
      "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223856928499"
    );
    expect(buildTrackingUrl("DHL", "1234567890")).toBe(
      "https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=1234567890"
    );
  });

  it("returns nothing for unknown carriers or empty numbers", () => {
    expect(buildTrackingUrl("Local Courier", "12345")).toBeUndefined();
    expect(buildTrackingUrl("UPS", "")).toBeUndefined();
  });

  it("URL-encodes the tracking number so it can't break out of the query", () => {
    const url = buildTrackingUrl("UPS", "1Z&evil=1#x")!;
    expect(url).toBe("https://www.ups.com/track?tracknum=1Z%26evil%3D1%23x");
  });
});

describe("fulfillment validation", () => {
  it("accepts a normal ESP order number and rejects empty, long or odd characters", () => {
    expect(parseEspOrderNumber("  PO-12345/A ")).toEqual({ ok: true, value: "PO-12345/A" });
    expect(parseEspOrderNumber("").ok).toBe(false);
    expect(parseEspOrderNumber("x".repeat(41)).ok).toBe(false);
    expect(parseEspOrderNumber("<script>").ok).toBe(false);
    expect(parseEspOrderNumber("12345; DROP").ok).toBe(false);
  });

  it("normalizes carrier and tracking number", () => {
    expect(parseShipment({ carrier: "  Fed   Ex ", trackingNumber: "1Z 999 AA1 0123" })).toEqual({
      ok: true,
      value: { carrier: "Fed Ex", trackingNumber: "1Z999AA10123" },
    });
  });

  it("rejects missing, oversized, or unsafe carrier and tracking values", () => {
    expect(parseShipment({ carrier: "", trackingNumber: "12345" }).ok).toBe(false);
    expect(parseShipment({ carrier: "UPS", trackingNumber: "" }).ok).toBe(false);
    expect(parseShipment({ carrier: "UPS", trackingNumber: "123" }).ok).toBe(false);
    expect(parseShipment({ carrier: "UPS", trackingNumber: "12345<b>" }).ok).toBe(false);
    expect(parseShipment({ carrier: "UPS", trackingNumber: "1".repeat(41) }).ok).toBe(false);
    expect(parseShipment({ carrier: "<script>", trackingNumber: "12345" }).ok).toBe(false);
    expect(parseShipment({ carrier: "C".repeat(41), trackingNumber: "12345" }).ok).toBe(false);
  });
});

describe("customer email senders", () => {
  beforeEach(() => {
    sent.emails.length = 0;
  });

  async function load() {
    vi.resetModules();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_EMAIL_FROM", "site@example.com");
    vi.stubEnv("CONTACT_EMAIL_TO", "business@example.com");
    return import("@/lib/email");
  }

  it("sends the confirmation to the customer with the business inbox as reply-to", async () => {
    const { sendMerchRequestConfirmation } = await load();
    const result = await sendMerchRequestConfirmation({
      email: "pat@example.com",
      firstName: "Pat",
      orderRef: "MG-00042",
      items: storedLines,
      total: 800,
    });
    expect(result).toEqual({ sent: true });
    expect(sent.emails).toHaveLength(1);
    expect(sent.emails[0].to).toBe("pat@example.com");
    expect(sent.emails[0].replyTo).toBe("business@example.com");
    expect(sent.emails[0].subject).toContain("MG-00042");
  });

  it("reports not_configured instead of throwing when Resend isn't set up", async () => {
    vi.resetModules();
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTACT_EMAIL_FROM", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const email = await import("@/lib/email");
    expect(
      await email.sendMerchShippedEmail({
        email: "a@b.co",
        firstName: "A",
        orderId: 1,
        carrier: "UPS",
        trackingNumber: "12345",
      })
    ).toEqual({ sent: false, reason: "not_configured" });
    expect(await email.sendMerchPaidEmail({ email: "a@b.co", firstName: "A", orderId: 1 })).toEqual(
      {
        sent: false,
        reason: "not_configured",
      }
    );
    expect(sent.emails).toHaveLength(0);
    warn.mockRestore();
  });

  it("business notification carries the reference, escapes customer input, and still has ESP data", async () => {
    const { sendCartOrderNotification } = await load();
    await sendCartOrderNotification({
      orderRef: "MG-00042",
      firstName: HOSTILE,
      lastName: "Lee",
      email: "pat@example.com",
      phone: "5555551234",
      notes: `hi ${HOSTILE}\nbye`,
      items: [
        {
          productId: "pen",
          name: "Pen",
          quantity: 250,
          unitPrice: 1.5,
          lineTotal: 375,
          espUrl: "https://espplus.com/products/555990121",
          espKind: "product",
          productNo: "OD618",
        },
      ],
      total: 375,
    });
    const { to, html, subject } = sent.emails[0];
    expect(to).toBe("business@example.com");
    expect(subject).toContain("MG-00042");
    expect(html).toContain("Order Reference");
    expect(html).toContain("MG-00042");
    expectNoRawHostile(html);
    expect(html).toContain(`hi ${ESCAPED}<br/>bye`);
    expect(html).toContain("OD618");
  });
});
