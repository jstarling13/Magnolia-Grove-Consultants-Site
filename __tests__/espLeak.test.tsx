import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

const sent = vi.hoisted(() => ({ emails: [] as { to: string; html: string }[] }));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (message: { to: string; html: string }) => {
        sent.emails.push(message);
        return { error: null };
      },
    };
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { merchandisePage, products } from "@/config/merchandiseConfig";
import { getCartCatalog } from "@/lib/merchStorefront";
import { CartProvider } from "@/components/merchandise/CartContext";
import CartPageContent from "@/components/merchandise/CartPageContent";
import type { PricedCartLineItem } from "@/lib/merchOrders";

const espItem: PricedCartLineItem = {
  productId: "pen",
  name: "Metal & Co. Pen",
  color: "Navy <Blue>",
  quantity: 250,
  unitPrice: 1.5,
  lineTotal: 375,
  espUrl: "https://espplus.com/products/555990121",
  espKind: "product",
  supplier: "Prime <Line>",
  productNo: "OD618",
};

async function loadEmail() {
  vi.resetModules();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("CONTACT_EMAIL_FROM", "site@example.com");
  vi.stubEnv("CONTACT_EMAIL_TO", "business@example.com");
  return import("@/lib/email");
}

describe("ESP link leak prevention", () => {
  beforeEach(() => {
    sent.emails.length = 0;
  });

  it("includes ESP link, supplier and product number in the business notification only", async () => {
    const { sendCartOrderNotification } = await loadEmail();
    await sendCartOrderNotification({
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
      phone: "5555555",
      notes: "",
      items: [
        espItem,
        { ...espItem, productId: "mug", color: undefined, espKind: "search", supplier: undefined },
      ],
      total: 750,
    });
    expect(sent.emails).toHaveLength(1);
    const { to, html } = sent.emails[0];
    expect(to).toBe("business@example.com");
    expect(html).toContain("https://espplus.com/products/555990121");
    expect(html).toContain("Open in ESP+ (search link)");
    expect(html).toContain("Supplier: Prime &lt;Line&gt;");
    expect(html).toContain("OD618");
    expect(html).toContain("Metal &amp; Co. Pen");
    expect(html).not.toContain("Prime <Line>");
    // Back-office-only color line: escaped, and "not specified" for lines without one.
    expect(html).toContain("Color: Navy &lt;Blue&gt;");
    expect(html).not.toContain("Navy <Blue>");
    expect(html).toContain("Color: not specified");
  });

  it("never puts ESP data in the customer payment-link email", async () => {
    const { sendMerchPaymentLinkEmail } = await loadEmail();
    await sendMerchPaymentLinkEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 7,
      total: 750,
      paymentUrl: "https://square.link/u/abc",
    });
    expect(sent.emails).toHaveLength(1);
    expect(sent.emails[0].to).toBe("pat@example.com");
    expect(sent.emails[0].html.toLowerCase()).not.toContain("espplus");
    expect(sent.emails[0].html.toLowerCase()).not.toContain("supplier:");
    expect(sent.emails[0].html).not.toContain("Color: ");
  });

  it("never puts ESP data in any customer-facing order email", async () => {
    const email = await loadEmail();
    const customerLines = [espItem, { ...espItem, productId: "mug", color: undefined }];
    const secrets = [
      "espplus",
      "Prime &lt;Line&gt;",
      "Prime <Line>",
      "OD618",
      "supplier:",
      "productno",
      "PO-SECRET-9",
      "espordernumber",
    ];

    await email.sendMerchRequestConfirmation({
      email: "pat@example.com",
      firstName: "Pat",
      orderRef: "MG-00007",
      // Pass whole stored lines, as a careless caller might: extra fields must be dropped.
      items: customerLines,
      total: 750,
      notes: "",
    });
    await email.sendMerchPaymentLinkEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 7,
      total: 750,
      paymentUrl: "https://square.link/u/abc",
    });
    await email.sendMerchPaidEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 7,
      amountPaid: 750,
    });
    await email.sendMerchShippedEmail({
      email: "pat@example.com",
      firstName: "Pat",
      orderId: 7,
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      // An extra espOrderNumber on the payload must not surface either.
      ...({ espOrderNumber: "PO-SECRET-9" } as object),
      items: customerLines,
    });

    expect(sent.emails).toHaveLength(4);
    for (const { to, html } of sent.emails) {
      expect(to).toBe("pat@example.com");
      const lower = html.toLowerCase();
      for (const secret of secrets) expect(lower).not.toContain(secret.toLowerCase());
      expect(html).toContain("MG-00007");
    }
  });

  it("keeps the cart page and thank-you page copy free of ESP links", async () => {
    window.localStorage.setItem(
      "mg-merch-cart",
      JSON.stringify([{ productId: products[0].id, color: products[0].colors?.[0], quantity: 250 }])
    );
    const { container } = render(
      <CartProvider>
        <CartPageContent
          catalog={getCartCatalog()}
          pricingDisclaimer={merchandisePage.pricingDisclaimer}
          deliveryEstimate={merchandisePage.deliveryEstimate}
        />
      </CartProvider>
    );
    expect(container.innerHTML.toLowerCase()).not.toContain("espplus");

    const { default: ThankYouPage } = await import("@/app/thank-you/page");
    for (const source of ["lead", "strategy", "merch"]) {
      const tree = await ThankYouPage({ searchParams: Promise.resolve({ source }) });
      expect(renderToStaticMarkup(tree).toLowerCase()).not.toContain("espplus");
    }
  });

  it("has no ESP-related keys on any product served to browsers", () => {
    const forbidden = /esp|supplier|asi|productNo/i;
    const offenders: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (Array.isArray(value)) {
        value.forEach((v, i) => walk(v, `${path}[${i}]`));
      } else if (value && typeof value === "object") {
        for (const [key, v] of Object.entries(value)) {
          if (forbidden.test(key)) offenders.push(`${path}.${key}`);
          walk(v, `${path}.${key}`);
        }
      } else if (typeof value === "string" && /espplus\.com/i.test(value)) {
        offenders.push(`${path} = ${value}`);
      }
    };
    products.forEach((p) => walk(p, p.id));
    expect(offenders).toEqual([]);
  });
});
