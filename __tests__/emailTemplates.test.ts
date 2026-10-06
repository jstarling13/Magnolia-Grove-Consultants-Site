// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Every email the store sends, rendered for a realistic order: layout and
 * plain-text alternative, required facts, no supplier/ESP data in anything a
 * customer can read, hostile input escaped, long input shortened. Nothing here
 * sends real mail: Resend is replaced by an in-memory capture.
 */

const sent = vi.hoisted(() => ({
  emails: [] as {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    html: string;
    text?: string;
  }[],
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (message: (typeof sent.emails)[number]) => {
        sent.emails.push(message);
        return { error: null };
      },
    };
  },
}));

import { contactDetails } from "@/config/siteConfig";
import { COLORS, customerLinesFromStored, truncate } from "@/lib/emailTemplates/layout";
import {
  buildMerchPaidEmail,
  buildMerchPaymentLinkEmail,
  buildMerchRequestConfirmationEmail,
  buildMerchShippedEmail,
  buildCartOrderNotificationEmail,
  type BuiltEmail,
} from "@/lib/email";

const SECRET = "test-secret-with-enough-length-0123456789";
const SITE = "https://shop.example.com";
const PHONE = contactDetails.find((d) => d.label === "Phone")!.value;
const CONTACT_EMAIL = contactDetails.find((d) => d.label === "Email")!.value;

/** Stored order lines as the database holds them: with backend-only fields a careless caller might pass. */
const storedItems = [
  {
    productId: "pen",
    name: "Metal Click Pen",
    color: "Navy",
    sizes: "",
    imprintNotes: "One color, white ink",
    quantity: 250,
    unitPrice: 1.5,
    lineTotal: 375,
    espUrl: "https://espplus.com/products/555990121",
    espKind: "product",
    supplier: "Prime Line Supplier Co",
    productNo: "OD618",
    asi: "asi/79530",
  },
  {
    productId: "polo",
    name: "Performance Polo",
    color: "Iron",
    sizes: "24 M, 60 L, 60 XL",
    quantity: 144,
    unitPrice: 20.25,
    lineTotal: 2916,
    espUrl: "https://espplus.com/products/551848490",
    supplier: "SanMar",
    productNo: "NKDC1963",
  },
];
const lines = customerLinesFromStored(storedItems);

/** Anything a customer must never see. */
const BACKEND_TERMS =
  /espplus|esp\+|supplier|sanmar|prime line|asi\/|productno|product no\.|espordernumber|espid|OD618|NKDC1963|PO-SECRET/i;

function build(): Record<string, BuiltEmail> {
  return {
    confirmation: buildMerchRequestConfirmationEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderRef: "MG-00042",
      items: storedItems as unknown as typeof lines,
      total: 3291,
      notes: "Need these before the rally.\nCall before delivery.",
    }),
    quote: buildMerchPaymentLinkEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 42,
      total: 3650.5,
      paymentUrl: "https://checkout.square.test/pay/LINK_1",
      items: lines,
    }),
    paid: buildMerchPaidEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 42,
      amountPaid: 3650.5,
      items: lines,
    }),
    shipped: buildMerchShippedEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 42,
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      items: storedItems as unknown as typeof lines,
    }),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("every customer email", () => {
  const emails = build();

  describe.each(Object.entries(emails))("%s", (_name, email) => {
    it("has a subject carrying the order reference, an html part and a text part", () => {
      expect(email.subject).toMatch(/^MG-\d{5}: /);
      expect(email.html.length).toBeGreaterThan(500);
      expect(email.text.length).toBeGreaterThan(100);
      expect(email.subject).not.toMatch(/[\r\n]/);
    });

    it("uses the shared mobile-friendly layout", () => {
      const { html } = email;
      expect(html.startsWith("<!doctype html>")).toBe(true);
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('name="viewport"');
      expect(html).toContain("max-width:600px");
      expect(html).toContain('role="presentation"');
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      // No images, icons or script of any kind.
      expect(html).not.toMatch(/<img|<svg|<script|<link|<iframe|<form/i);
      expect(html).not.toMatch(/url\(/i);
    });

    it("has a hidden preheader that is real preview text", () => {
      const match = /<div style="display:none[^"]*">([^<]+)<\/div>/.exec(email.html);
      expect(match).not.toBeNull();
      const visible = match![1].replace(/&nbsp;|&zwnj;/g, "").trim();
      expect(visible.length).toBeGreaterThan(15);
    });

    it("shows the reference in the body and in the plain text", () => {
      expect(email.html).toContain("MG-00042");
      expect(email.text).toContain("MG-00042");
    });

    it("shows the business contact details from siteConfig in both parts", () => {
      for (const part of [email.html, email.text]) {
        expect(part).toContain(PHONE);
        expect(part).toContain(CONTACT_EMAIL);
        expect(part).toContain("Magnolia Grove Consultants");
      }
      expect(email.html).toContain('href="tel:+17065731719"');
      expect(email.html).toContain(`href="mailto:${CONTACT_EMAIL}"`);
    });

    it("never contains supplier, ESP, product-number or cost data", () => {
      expect(`${email.subject}\n${email.html}\n${email.text}`).not.toMatch(BACKEND_TERMS);
    });

    it("contains no emoji and no decorative symbols", () => {
      for (const part of [email.subject, email.html, email.text]) {
        expect(part).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    });

    it("only links to http(s), mailto and tel", () => {
      for (const [, href] of email.html.matchAll(/href="([^"]*)"/g)) {
        expect(href).toMatch(/^(https?:\/\/|mailto:|tel:)/);
      }
    });

    it("promises no dates", () => {
      expect(email.text).not.toMatch(
        /\b(within \d|by (monday|tuesday|wednesday|thursday|friday)|business days?|tomorrow|today)\b/i
      );
    });
  });
});

describe("what each email says", () => {
  const emails = build();

  it("confirmation lists every line with prices, notes, the subtotal and the next steps", () => {
    const { html, text, subject } = emails.confirmation;
    expect(subject).toBe("MG-00042: Your Magnolia Grove request is in");
    for (const part of [html, text]) {
      expect(part).toContain("Metal Click Pen");
      expect(part).toContain("Performance Polo");
      expect(part).toContain("Navy");
      expect(part).toContain("Iron");
      expect(part).toContain("$1.50");
      expect(part).toContain("$375.00");
      expect(part).toContain("$20.25");
      expect(part).toContain("$2916.00");
      expect(part).toContain("Sizes and quantities: 24 M, 60 L, 60 XL");
      expect(part).toContain("Imprint notes: One color, white ink");
      expect(part).toContain("$3291.00");
      expect(part).toContain("Nothing has been charged");
      expect(part).toContain("final quote with a secure link to pay");
      expect(part).toContain("after your payment clears");
    }
    expect(html).toContain("Need these before the rally.<br/>Call before delivery.");
    expect(text).toContain("Need these before the rally.\nCall before delivery.");
  });

  it("quote has the total, the pay link in both parts, and the lines it covers", () => {
    const { html, text } = emails.quote;
    for (const part of [html, text]) {
      expect(part).toContain("$3650.50");
      expect(part).toContain("https://checkout.square.test/pay/LINK_1");
      expect(part).toContain("Metal Click Pen");
      expect(part).toContain("Performance Polo");
    }
    expect(html).toContain('href="https://checkout.square.test/pay/LINK_1"');
    expect(html).toContain("Pay Securely Online");
    expect(html).toContain("Total Due");
    expect(text).toMatch(/place your order as soon as payment clears/i);
    expect(text).toMatch(/tracking details when it ships/i);
  });

  it("quote works without a line list (older callers) and still has total and link", () => {
    const { html, text } = buildMerchPaymentLinkEmail({
      email: "a@b.co",
      firstName: "Pat",
      orderId: 7,
      total: 750,
      paymentUrl: "https://square.link/u/abc",
    });
    expect(html).toContain("$750.00");
    expect(html).not.toContain("<thead>");
    expect(text).toContain("https://square.link/u/abc");
  });

  it("quote never renders a non-http payment link as a button", () => {
    const { html, text } = buildMerchPaymentLinkEmail({
      email: "a@b.co",
      firstName: "Pat",
      orderId: 7,
      total: 750,
      paymentUrl: 'javascript:alert("x")',
    });
    expect(html).not.toContain("javascript:");
    expect(text).not.toContain("javascript:");
    expect(html).not.toContain("Pay Securely Online");
  });

  it("receipt shows the amount paid, the lines, and that we are placing the order", () => {
    const { html, text } = emails.paid;
    for (const part of [html, text]) {
      expect(part).toContain("$3650.50");
      expect(part).toContain("Amount Paid");
      expect(part).toContain("Performance Polo");
      expect(part).toContain("placing your order now");
      expect(part).toContain("tracking details when it ships");
    }
  });

  it("receipt does not invent an amount", () => {
    const { html, text } = buildMerchPaidEmail({ email: "a@b.co", firstName: "Pat", orderId: 3 });
    expect(html).not.toContain("Amount Paid");
    expect(text).not.toContain("Amount Paid");
    expect(html + text).not.toContain("$");
  });

  it("shipped shows carrier, tracking number, the package link and what shipped, without prices", () => {
    const { html, text } = emails.shipped;
    for (const part of [html, text]) {
      expect(part).toContain("UPS");
      expect(part).toContain("1Z999AA10123456784");
      expect(part).toContain("https://www.ups.com/track?tracknum=1Z999AA10123456784");
      expect(part).toContain("Metal Click Pen");
      expect(part).toContain("Performance Polo");
      expect(part).not.toContain("$");
    }
    expect(html).toContain("Track Your Package");
  });

  it("shipped for an unrecognized carrier shows the number and tells the customer where to use it", () => {
    const { html, text } = buildMerchShippedEmail({
      email: "a@b.co",
      firstName: "Pat",
      orderId: 9,
      carrier: "Local Courier",
      trackingNumber: "LC-12345",
    });
    for (const part of [html, text]) {
      expect(part).toContain("Local Courier");
      expect(part).toContain("LC-12345");
    }
    expect(html).not.toContain("Track Your Package");
    expect(html).not.toMatch(/href="https?:/);
  });

  it("lines without prices show item and quantity only", () => {
    const { html, text } = buildMerchRequestConfirmationEmail({
      email: "a@b.co",
      firstName: "Pat",
      orderRef: "MG-00001",
      items: [{ name: "Tote Bag", quantity: 100 }],
      total: 0,
    });
    expect(html).not.toContain(">Unit<");
    expect(html).toContain(">100<");
    expect(text).toContain("Qty 100");
  });
});

describe("track-your-order link", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  });

  it("appears in html and text on all four emails only when ORDER_LINK_SECRET is set", () => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    for (const email of Object.values(build())) {
      expect(email.html).toContain("Track your order");
      expect(email.html).toContain(`${SITE}/orders/MG-00042`);
      expect(email.text).toContain(`${SITE}/orders/MG-00042`);
    }
  });

  it.each([undefined, "", "   ", "short"])(
    "is absent everywhere when the secret is %j",
    (secret) => {
      vi.stubEnv("ORDER_LINK_SECRET", secret as string);
      for (const email of Object.values(build())) {
        expect(email.html).not.toContain("Track your order");
        expect(email.html).not.toContain("/orders/");
        expect(email.text).not.toContain("/orders/");
        expect(email.text).not.toMatch(/track your order/i);
      }
    }
  );

  it("never prints the secret", () => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    for (const email of Object.values(build())) {
      expect(email.html + email.text + email.subject).not.toContain(SECRET);
    }
  });
});

describe("hostile input", () => {
  const SCRIPT = `<script>alert("pwn")</script>`;
  const IMG = `<img src=x onerror=alert(1)>`;
  const ANCHOR = `"><a href="https://evil.example">click</a>`;
  const SVG = `<svg onload=alert(1)>`;
  const HOSTILE = `${SCRIPT}${IMG}${ANCHOR}${SVG}`;

  function expectInert(html: string) {
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain('<a href="https://evil.example"');
    expect(html).not.toContain('evil.example">click');
    expect(html).toContain("&lt;script&gt;");
    // Only our own links remain.
    for (const [, href] of html.matchAll(/href="([^"]*)"/g)) {
      expect(href).not.toContain("evil.example");
    }
  }

  const hostileLines = [
    {
      name: HOSTILE,
      color: HOSTILE,
      sizes: HOSTILE,
      imprintNotes: HOSTILE,
      quantity: 12,
      unitPrice: 2,
      lineTotal: 24,
    },
  ];

  it("is escaped in the confirmation (name, notes, product, color, sizes, imprint)", () => {
    const { html, subject } = buildMerchRequestConfirmationEmail({
      email: "a@b.co",
      firstName: HOSTILE,
      orderRef: "MG-00042",
      items: hostileLines,
      total: 24,
      notes: `${HOSTILE}\nsecond line`,
    });
    expectInert(html);
    expect(html).toContain("second line");
    expect(subject).not.toContain("<");
  });

  it("is escaped in the quote, receipt and shipped emails", () => {
    expectInert(
      buildMerchPaymentLinkEmail({
        email: "a@b.co",
        firstName: HOSTILE,
        orderId: 5,
        total: 24,
        paymentUrl: `https://pay.example/x"onmouseover="alert(1)`,
        items: hostileLines,
      }).html
    );
    expectInert(
      buildMerchPaidEmail({ email: "a@b.co", firstName: HOSTILE, orderId: 5, items: hostileLines })
        .html
    );
    expectInert(
      buildMerchShippedEmail({
        email: "a@b.co",
        firstName: HOSTILE,
        orderId: 5,
        carrier: HOSTILE,
        trackingNumber: HOSTILE,
        items: hostileLines,
      }).html
    );
  });

  it("does not let a quote href break out of its attribute", () => {
    const { html } = buildMerchPaymentLinkEmail({
      email: "a@b.co",
      firstName: "Pat",
      orderId: 5,
      total: 24,
      paymentUrl: `https://pay.example/x"onmouseover="alert(1)`,
    });
    expect(html).not.toMatch(/"\s*onmouseover=/);
    expect(html).toContain("&quot;onmouseover=&quot;");
  });

  it("is escaped in the admin notification, including the back-office fields", () => {
    const { html, subject } = buildCartOrderNotificationEmail({
      orderRef: "MG-00042",
      firstName: HOSTILE,
      lastName: `Lee\r\nBcc: attacker@example.com`,
      email: "a@b.co",
      phone: HOSTILE,
      notes: HOSTILE,
      total: 24,
      items: [
        {
          productId: "p",
          name: HOSTILE,
          color: HOSTILE,
          sizes: HOSTILE,
          imprintNotes: HOSTILE,
          quantity: 12,
          unitPrice: 2,
          lineTotal: 24,
          supplier: HOSTILE,
          productNo: HOSTILE,
        },
      ],
    });
    expectInert(html);
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it("collapses line breaks in subjects built from customer text", () => {
    const { subject } = buildCartOrderNotificationEmail({
      firstName: "Pat\r\nBcc: attacker@example.com",
      lastName: "Lee\nX-Evil: 1",
      email: "a@b.co",
      phone: "555",
      notes: "",
      total: 1,
      items: [],
    });
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe("long input", () => {
  it("shortens an absurdly long note and says so, in both parts", () => {
    const note = `start ${"word ".repeat(40_000)}END_MARKER`;
    const { html, text } = buildMerchRequestConfirmationEmail({
      email: "a@b.co",
      firstName: "Pat",
      orderRef: "MG-00042",
      items: lines,
      total: 1,
      notes: note,
    });
    for (const part of [html, text]) {
      expect(part.length).toBeLessThan(20_000);
      expect(part).toContain("(shortened)");
      expect(part).not.toContain("END_MARKER");
      expect(part).toContain("start word");
    }
  });

  it("shortens long names, line fields and tracking numbers", () => {
    const big = "N".repeat(50_000);
    const { html } = buildMerchRequestConfirmationEmail({
      email: "a@b.co",
      firstName: big,
      orderRef: "MG-00042",
      items: [{ name: big, color: big, sizes: big, imprintNotes: big, quantity: 1 }],
      total: 1,
    });
    expect(html.length).toBeLessThan(20_000);
    const shipped = buildMerchShippedEmail({
      email: "a@b.co",
      firstName: "Pat",
      orderId: 1,
      carrier: big,
      trackingNumber: big,
    });
    expect(shipped.html.length).toBeLessThan(20_000);
    expect(shipped.text.length).toBeLessThan(20_000);
  });

  it("never cuts a character in half", () => {
    const cut = truncate("\u{1F600}".repeat(5000), 101);
    expect(Array.from(cut).slice(0, 101).join("")).toBe("\u{1F600}".repeat(101));
    // No lone surrogate anywhere.
    expect(cut).not.toMatch(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
    );
  });

  it("leaves normal-length text untouched and strips control characters", () => {
    expect(truncate("Left chest & sleeve", 400)).toBe("Left chest & sleeve");
    expect(truncate("a\u0000b\u0007c\td\ne", 50)).toBe("abc\td\ne");
  });
});

describe("customerLinesFromStored", () => {
  it("keeps only customer-safe fields and skips malformed lines", () => {
    const out = customerLinesFromStored([
      ...storedItems,
      null,
      "x",
      { name: "", quantity: 1 },
      { name: "No quantity" },
      { name: "Bad quantity", quantity: Number.NaN },
    ]);
    expect(out).toHaveLength(2);
    expect(JSON.stringify(out)).not.toMatch(BACKEND_TERMS);
    expect(out[0]).toEqual({
      name: "Metal Click Pen",
      color: "Navy",
      imprintNotes: "One color, white ink",
      quantity: 250,
      unitPrice: 1.5,
      lineTotal: 375,
    });
    expect(customerLinesFromStored(undefined)).toEqual([]);
    expect(customerLinesFromStored("nope")).toEqual([]);
  });
});

describe("order email subjects", () => {
  const lines = [{ name: "Tee", quantity: 1, unitPrice: 10, lineTotal: 10 }] as never;

  it("every order email, admin notification included, starts with the order reference", () => {
    const all = [
      ...Object.values(build()),
      buildCartOrderNotificationEmail({
        orderRef: "MG-00042",
        firstName: "Pat",
        lastName: "Lee",
        email: "pat@example.com",
        phone: "555-0100",
        notes: "",
        total: 10,
        items: storedItems as never,
      }),
    ];
    expect(all.length).toBeGreaterThanOrEqual(5);
    for (const mail of all) expect(mail.subject).toMatch(/^MG-\d{5}: /);
  });

  it("falls back to a plain subject when the order has no reference", () => {
    const mail = buildMerchRequestConfirmationEmail({
      email: "pat@example.com",
      firstName: "Pat",
      items: lines,
      total: 10,
    });
    expect(mail.subject).toBe("Your Magnolia Grove request is in");
  });

  it("keeps the admin subject short and cuts a very long name safely", () => {
    const mail = buildCartOrderNotificationEmail({
      orderRef: "MG-00042",
      firstName: "Bartholomew-Maximilian\u{1F600}".repeat(3),
      lastName: "Featherstonehaugh\nCholmondeley",
      email: "pat@example.com",
      phone: "555-0100",
      notes: "",
      total: 10,
      items: storedItems as never,
    });
    expect(mail.subject).toMatch(/^MG-00042: New merchandise request from /);
    expect(Array.from(mail.subject).length).toBeLessThanOrEqual(70);
    expect(mail.subject).toMatch(/…$/);
    expect(mail.subject).not.toMatch(/[\r\n\uD800-\uDFFF]/u);
  });
});

describe("admin notification", () => {
  const email = buildCartOrderNotificationEmail({
    orderRef: "MG-00042",
    firstName: "Pat",
    lastName: "Lee",
    email: "pat@example.com",
    phone: "555-0100",
    notes: "Rush if possible\nthanks",
    total: 3291,
    items: storedItems as never,
  });

  it("has html and text with the reference, customer details, lines and back-office lookup data", () => {
    expect(email.subject).toBe("MG-00042: New merchandise request from Pat Lee");
    for (const part of [email.html, email.text]) {
      expect(part).toContain("MG-00042");
      expect(part).toContain("pat@example.com");
      expect(part).toContain("555-0100");
      expect(part).toContain("Metal Click Pen");
      expect(part).toContain("$3291.00");
      expect(part).toContain("Prime Line Supplier Co");
      expect(part).toContain("OD618");
      expect(part).toContain("https://espplus.com/products/555990121");
      expect(part).toContain("Sizes and quantities: 24 M, 60 L, 60 XL");
    }
    expect(email.html).toContain("Rush if possible<br/>thanks");
    expect(email.text).toContain("Rush if possible\nthanks");
  });

  it("is marked internal and has no customer contact footer", () => {
    expect(email.html).toContain("Internal notification");
    expect(email.html).not.toContain(CONTACT_EMAIL);
  });
});

describe("sending (multipart, mocked Resend)", () => {
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

  it("sends every order email with both html and text, customers first and replies to the business", async () => {
    const email = await load();
    await email.sendMerchRequestConfirmation({
      email: "pat@example.com",
      firstName: "Pat",
      orderRef: "MG-00042",
      items: lines,
      total: 3291,
    });
    await email.sendMerchPaymentLinkEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 42,
      total: 3650.5,
      paymentUrl: "https://square.link/u/abc",
      items: lines,
    });
    await email.sendMerchPaidEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 42,
      amountPaid: 3650.5,
    });
    await email.sendMerchShippedEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 42,
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
    });
    await email.sendCartOrderNotification({
      orderRef: "MG-00042",
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
      phone: "555-0100",
      notes: "",
      total: 3291,
      items: storedItems as never,
    });

    expect(sent.emails).toHaveLength(5);
    for (const mail of sent.emails) {
      expect(mail.html).toContain("<!doctype html>");
      expect(mail.text).toBeTruthy();
      expect(mail.text).not.toMatch(/<[a-z][^>]*>/i);
      expect(mail.subject).toMatch(/^MG-\d{5}: /);
    }
    const customerMails = sent.emails.slice(0, 4);
    for (const mail of customerMails) {
      expect(mail.to).toBe("pat@example.com");
      expect(mail.replyTo).toBe("business@example.com");
      expect(`${mail.subject}\n${mail.html}\n${mail.text}`).not.toMatch(BACKEND_TERMS);
    }
    expect(sent.emails[4].to).toBe("business@example.com");
  });

  it("sends the website form emails multipart too", async () => {
    const email = await load();
    await email.sendLeadNotification({
      formType: "lead",
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
      phone: "5555550100",
      service: "Print",
      message: "Hello\nthere",
    });
    await email.sendLeadAutoResponder({
      formType: "lead",
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
      phone: "5555550100",
      service: "Print",
      message: "Hello",
    });
    expect(sent.emails).toHaveLength(2);
    for (const mail of sent.emails) {
      expect(mail.html).toContain("<!doctype html>");
      expect(mail.text).toContain("Pat");
    }
    expect(sent.emails[0].text).toContain("Message:\nHello\nthere");
  });
});

describe("colors", () => {
  function luminance(hex: string): number {
    const channel = (offset: number) => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  }
  function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  it.each([
    ["ink", COLORS.ink, COLORS.card],
    ["ink on cream", COLORS.ink, COLORS.cream],
    ["muted", COLORS.muted, COLORS.card],
    ["muted on cream", COLORS.muted, COLORS.cream],
    ["link gold text", COLORS.goldText, COLORS.card],
    ["link gold text on cream", COLORS.goldText, COLORS.cream],
    ["button label", COLORS.onyx, COLORS.gold],
    ["wordmark", "#ffffff", COLORS.onyx],
  ])("%s meets WCAG AA (4.5:1)", (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
