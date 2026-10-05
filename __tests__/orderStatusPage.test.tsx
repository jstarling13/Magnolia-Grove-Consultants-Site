import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  checkRateLimit: vi.fn(),
  requestHeaders: new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
}));

vi.mock("@/lib/db", () => ({ sql: mocks.sql }));
vi.mock("@/lib/ratelimit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("next/headers", () => ({ headers: async () => mocks.requestHeaders }));

import OrderPage, { metadata } from "@/app/orders/[ref]/page";
import { TIMELINE_STEPS, toOrderView } from "@/app/orders/orderView";
import { createOrderToken } from "@/lib/orderTracking";

const SECRET = "test-secret-with-enough-length-0123456789";

/** A stored order carrying every backend-only field a careless view could leak. */
function storedOrder(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Pat",
    lastName: "Lee",
    email: "pat@example.com",
    phone: "706-555-0188",
    product: "Metal Pen",
    quantity: "250",
    notes: "INTERNAL-NOTE: customer is a repeat buyer, ask about discount",
    status: "new",
    total: 375,
    items: [
      {
        productId: "pen",
        name: "Metal Pen",
        color: "Navy",
        quantity: 250,
        unitPrice: 1.5,
        lineTotal: 375,
        espUrl: "https://espplus.com/products/555990121",
        espKind: "product",
        supplier: "Prime Line Supplier",
        asi: "ASI-123",
        productNo: "OD618",
      },
    ],
    espOrderNumber: "PO-SECRET-9",
    espCost: 211.11,
    internalNotes: "margin 40%",
    paymentUrl: "https://square.link/u/abc",
    paymentLinkId: "LINK-SECRET",
    ...overrides,
  };
}

function mockRow(data: Record<string, unknown> | undefined, createdAt = "2026-09-01T15:00:00Z") {
  mocks.sql.mockResolvedValue(data ? [{ data, created_at: createdAt }] : []);
}

async function renderPage(ref: string, t: string | string[] | undefined) {
  const tree = await OrderPage({
    params: Promise.resolve({ ref }),
    searchParams: Promise.resolve(t === undefined ? {} : { t }),
  });
  return renderToStaticMarkup(tree);
}

async function expect404(ref: string, t: string | string[] | undefined) {
  await expect(renderPage(ref, t)).rejects.toMatchObject({
    digest: expect.stringContaining("404"),
  });
}

describe("order status page", () => {
  beforeEach(() => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    mocks.sql.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.checkRateLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4 });
    mockRow(storedOrder());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("access", () => {
    it("is noindex, nofollow, nocache and sends no referrer", () => {
      expect(metadata.robots).toMatchObject({ index: false, follow: false, nocache: true });
      expect(metadata.referrer).toBe("no-referrer");
    });

    it("renders for a valid ref and token", async () => {
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("Order MG-00042");
      expect(mocks.sql).toHaveBeenCalledTimes(1);
    });

    it("looks up only merch orders, by the parsed id", async () => {
      await renderPage("MG-00042", createOrderToken(42));
      const [strings, ...values] = mocks.sql.mock.calls[0] as [string[], ...unknown[]];
      expect(strings.join("?")).toContain("type = 'merch_order'");
      expect(values).toEqual([42]);
    });

    it("accepts lowercase and whitespace-padded refs", async () => {
      const token = createOrderToken(42);
      expect(await renderPage("mg-00042", token)).toContain("Order MG-00042");
      expect(await renderPage("%20MG-00042%20", token)).toContain("Order MG-00042");
      expect(await renderPage("MG-42", token)).toContain("Order MG-00042");
    });

    it("404s when the feature is off, without touching the database", async () => {
      const token = createOrderToken(42);
      vi.stubEnv("ORDER_LINK_SECRET", "");
      await expect404("MG-00042", token);
      expect(mocks.sql).not.toHaveBeenCalled();
    });

    it("404s on a missing, wrong, other-order, or malformed token without querying", async () => {
      const other = createOrderToken(43);
      const good = createOrderToken(42)!;
      for (const t of [undefined, "", "nope", other, good.slice(0, -1), `${good}x`, [good, good]]) {
        await expect404("MG-00042", t);
      }
      expect(mocks.sql).not.toHaveBeenCalled();
    });

    it("404s on malformed refs and huge numbers, even with a token for that text", async () => {
      for (const ref of [
        "42",
        "MG-",
        "MG-0",
        "garbage",
        "MG-99999999999999999999",
        "MG-2147483648",
        "MG-1%ZZ",
        "MG-00042%00",
      ]) {
        await expect404(ref, createOrderToken(42));
      }
      expect(mocks.sql).not.toHaveBeenCalled();
    });

    it("404s identically for a valid token whose order does not exist", async () => {
      mockRow(undefined);
      const missing = renderPage("MG-00042", createOrderToken(42));
      await expect(missing).rejects.toMatchObject({ digest: expect.stringContaining("404") });
      // Same error as a bad token, so the response can't reveal which refs exist.
      let badToken: unknown;
      try {
        await renderPage("MG-00042", "bad");
      } catch (error) {
        badToken = error;
      }
      let noOrder: unknown;
      try {
        await renderPage("MG-00042", createOrderToken(42));
      } catch (error) {
        noOrder = error;
      }
      expect((noOrder as { digest: string }).digest).toBe((badToken as { digest: string }).digest);
    });

    it("does not catch database failures as a 404", async () => {
      mocks.sql.mockRejectedValue(new Error("connection refused"));
      await expect(renderPage("MG-00042", createOrderToken(42))).rejects.toThrow(
        "connection refused"
      );
    });

    it("is rate limited per client IP, before any database work", async () => {
      mocks.checkRateLimit.mockResolvedValue({ success: false, limit: 5, remaining: 0 });
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(mocks.checkRateLimit).toHaveBeenCalledWith("order-status:203.0.113.9");
      expect(mocks.sql).not.toHaveBeenCalled();
      expect(html).toContain("Please try again shortly");
      expect(html).not.toContain("MG-00042");
    });
  });

  describe("content", () => {
    it("shows the timeline with the current step highlighted", async () => {
      mockRow(storedOrder({ status: "awaiting_payment", quotedTotal: 412.5 }));
      const html = await renderPage("MG-00042", createOrderToken(42));
      for (const step of TIMELINE_STEPS) expect(html).toContain(step.label);
      expect(html.match(/aria-current="step"/g)).toHaveLength(1);
      expect(html).toMatch(/aria-current="step"[^>]*data-state="current"[^>]*>[\s\S]*?Quote sent/);
      expect(html.match(/data-state="done"/g)).toHaveLength(1);
      expect(html.match(/data-state="upcoming"/g)).toHaveLength(3);
    });

    it.each([
      ["new", 0],
      ["reviewing", 0],
      ["quoted", 0],
      ["awaiting_payment", 1],
      ["paid", 2],
      ["ordered_in_esp", 3],
      ["fulfilled", 4],
    ])("maps status %s to step %i", (status, step) => {
      expect(toOrderView(42, { status }).currentStep).toBe(step);
    });

    it("treats a missing or unknown status as a fresh request", () => {
      expect(toOrderView(42, {}).currentStep).toBe(0);
      expect(toOrderView(42, { status: "mystery" }).currentStep).toBe(0);
    });

    it("lists items with color, quantity and line total, and an estimate before a quote", async () => {
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("Metal Pen");
      expect(html).toContain("Navy");
      expect(html).toContain("250");
      expect(html).toContain("$375.00");
      expect(html).toContain("Estimated subtotal");
      expect(html).not.toContain("Quoted total");
    });

    it("shows the quoted total once a quote exists", async () => {
      mockRow(storedOrder({ status: "awaiting_payment", quotedTotal: 412.5 }));
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("Quoted total");
      expect(html).toContain("$412.50");
      expect(html).not.toContain("Estimated subtotal");
    });

    it("shows the carrier, number, and a tracking link for a known carrier", async () => {
      mockRow(
        storedOrder({
          status: "fulfilled",
          carrier: "ups",
          trackingNumber: "1Z999AA10123456784",
          shippedAt: "2026-09-10T12:00:00Z",
        })
      );
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("UPS");
      expect(html).toContain("1Z999AA10123456784");
      expect(html).toContain('href="https://www.ups.com/track?tracknum=1Z999AA10123456784"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain("September 10, 2026");
    });

    it("shows the number but no link for an unrecognized carrier", async () => {
      mockRow(
        storedOrder({ status: "fulfilled", carrier: "Local Courier", trackingNumber: "ABC12345" })
      );
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("Local Courier");
      expect(html).toContain("ABC12345");
      expect(html).not.toContain("Track your package");
    });

    it("shows no shipping box until there is a shipment", async () => {
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).not.toContain("Tracking number");
    });

    it("shows request and payment dates when known", async () => {
      mockRow(
        storedOrder({ status: "paid", paidAt: "2026-09-05T18:00:00Z" }),
        "2026-09-01T15:00:00Z"
      );
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("September 1, 2026");
      expect(html).toContain("September 5, 2026");
    });

    it("says a cancelled order is cancelled, politely, with no timeline", async () => {
      mockRow(storedOrder({ status: "cancelled" }));
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("This order has been cancelled");
      expect(html).toContain("glad to help");
      expect(html).not.toContain("aria-current");
      expect(html).not.toContain("In production");
    });

    it("shows no shipment on a cancelled order", () => {
      const view = toOrderView(
        42,
        storedOrder({ status: "cancelled", carrier: "UPS", trackingNumber: "1Z999AA10123456784" })
      );
      expect(view.shipment).toBeUndefined();
    });

    it("has a contact line that mentions the order reference", async () => {
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("mailto:ben@magnoliagrovega.com");
      expect(html).toContain("tel:+17065731719");
      expect(html).toContain("mention MG-00042");
    });

    it("escapes hostile item text", async () => {
      mockRow(
        storedOrder({
          items: [{ name: "<script>alert(1)</script>", color: '"><img src=x>', quantity: 3 }],
        })
      );
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).not.toContain("<script>alert(1)");
      expect(html).not.toContain("<img src=x>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("skips malformed stored lines instead of failing", async () => {
      mockRow(
        storedOrder({
          items: [
            null,
            "x",
            { name: "", quantity: 2 },
            { name: "Ok", quantity: 0 },
            { name: "Good", quantity: 2 },
          ],
        })
      );
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("Good");
    });
  });

  describe("privacy", () => {
    const statuses = [
      "new",
      "awaiting_payment",
      "paid",
      "ordered_in_esp",
      "fulfilled",
      "cancelled",
    ];

    it("masks the email and never shows the phone, notes, or names in full", async () => {
      const html = await renderPage("MG-00042", createOrderToken(42));
      expect(html).toContain("p***@example.com");
      expect(html).not.toContain("pat@example.com");
      expect(html).not.toContain("706-555-0188");
      expect(html).not.toContain("5550188");
      expect(html).not.toContain("INTERNAL-NOTE");
      expect(html).not.toContain("Lee");
    });

    it.each(statuses)("never exposes ESP, supplier, cost or internal data (%s)", async (status) => {
      mockRow(
        storedOrder({
          status,
          carrier: "FedEx",
          trackingNumber: "123456789012",
          quotedTotal: 500,
          paidAt: "2026-09-05T18:00:00Z",
        })
      );
      const html = (await renderPage("MG-00042", createOrderToken(42))).toLowerCase();
      for (const secret of [
        "espplus",
        "supplier",
        "prime line",
        "asi-123",
        "od618",
        "productno",
        "po-secret-9",
        "espordernumber",
        "espcost",
        "211.11",
        "margin 40",
        "square.link",
        "link-secret",
        "internal",
      ]) {
        // The page's own copy says "our supplier" once; the name and data never appear.
        if (secret === "supplier") continue;
        expect(html).not.toContain(secret);
      }
    });

    it("builds the view from an allowlist: unknown stored fields cannot appear", () => {
      const view = toOrderView(
        42,
        storedOrder({ somethingNew: "SURPRISE-VALUE", status: "paid", carrier: "UPS" })
      );
      expect(JSON.stringify(view)).not.toMatch(
        /SURPRISE|espplus|Prime Line|OD618|PO-SECRET|pat@example|706-555|INTERNAL-NOTE|square\.link/
      );
      expect(Object.keys(view).sort()).toEqual(
        ["cancelled", "currentStep", "dates", "items", "maskedEmail", "ref", "total"].sort()
      );
      expect(Object.keys(view.items[0]).sort()).toEqual(
        ["color", "lineTotal", "name", "quantity"].sort()
      );
    });
  });
});
