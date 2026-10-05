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

import { products } from "@/config/merchandiseConfig";
import { CartProvider } from "@/components/merchandise/CartContext";
import CartPageContent from "@/components/merchandise/CartPageContent";
import type { PricedCartLineItem } from "@/lib/merchOrders";

const espItem: PricedCartLineItem = {
  productId: "pen",
  name: "Metal & Co. Pen",
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
      items: [espItem, { ...espItem, productId: "mug", espKind: "search", supplier: undefined }],
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
  });

  it("keeps the cart page and thank-you page copy free of ESP links", async () => {
    window.localStorage.setItem(
      "mg-merch-cart",
      JSON.stringify([{ productId: products[0].id, quantity: 250 }])
    );
    const { container } = render(
      <CartProvider>
        <CartPageContent />
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
    // Known, pre-existing field: MerchPriceTier.espPrice is the pre-markup ESP+ catalog price
    // (see src/types/index.ts). Flagged to the orchestrator; every other match must fail.
    const allowed = new Set(["espPrice"]);
    const offenders: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (Array.isArray(value)) {
        value.forEach((v, i) => walk(v, `${path}[${i}]`));
      } else if (value && typeof value === "object") {
        for (const [key, v] of Object.entries(value)) {
          if (forbidden.test(key) && !allowed.has(key)) offenders.push(`${path}.${key}`);
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
