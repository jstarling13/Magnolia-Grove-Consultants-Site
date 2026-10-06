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
// No product in the real catalog is color-less, so add one to exercise that rule.
vi.mock("@/config/merchandiseConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/merchandiseConfig")>();
  return {
    ...actual,
    getProductById: (id: string) =>
      id === "plain-test-item"
        ? {
            id,
            name: "Plain Test Item",
            category: "Office & Writing",
            brand: "Essentials",
            description: "",
            priceTiers: [
              { quantity: 10, price: 2.1 },
              { quantity: 100, price: 1.05 },
            ],
          }
        : actual.getProductById(id),
  };
});

import { NextRequest } from "next/server";
import { POST } from "@/app/api/merchant/cart-checkout/route";
import { cartCheckoutSchema } from "@/lib/merchOrders";

// Real catalog data: 4 colors, tiers 6 / 12 / 24 / 48.
const VEST = "peter-millar-galway-stretch-vest";
const VEST_COLORS = ["Black", "Iron", "White", "Navy"];

const contact = {
  firstName: "Pat",
  lastName: "Lee",
  email: "pat@example.com",
  phone: "5555551234",
  notes: "",
};

function post(items: unknown[]) {
  return POST(
    new NextRequest("http://localhost/api/merchant/cart-checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify({ ...contact, items }),
    })
  );
}

describe("cartCheckoutSchema", () => {
  const base = { ...contact, items: [] as unknown[] };

  it("accepts an optional hasLogo flag but never a file", () => {
    const line = { productId: VEST, color: "Navy", quantity: 6 };
    expect(cartCheckoutSchema.safeParse({ ...base, items: [line], hasLogo: true }).success).toBe(
      true
    );
    expect(cartCheckoutSchema.safeParse({ ...base, items: [line] }).success).toBe(true);
    expect(cartCheckoutSchema.safeParse({ ...base, items: [line], hasLogo: "yes" }).success).toBe(
      false
    );
    const parsed = cartCheckoutSchema.parse({
      ...base,
      items: [line],
      logo: "data:image/png;base64,AAAA",
    });
    expect(parsed).not.toHaveProperty("logo");
  });

  it("accepts lines with and without a color", () => {
    const parsed = cartCheckoutSchema.safeParse({
      ...base,
      items: [
        { productId: VEST, color: "Navy", quantity: 6 },
        { productId: "plain-test-item", quantity: 10 },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items[0].color).toBe("Navy");
      expect(parsed.data.items[1].color).toBeUndefined();
    }
  });

  it("rejects a non-string or oversized color", () => {
    expect(
      cartCheckoutSchema.safeParse({ ...base, items: [{ productId: VEST, color: 5, quantity: 6 }] })
        .success
    ).toBe(false);
    expect(
      cartCheckoutSchema.safeParse({
        ...base,
        items: [{ productId: VEST, color: "x".repeat(101), quantity: 6 }],
      }).success
    ).toBe(false);
  });
});

describe("cartCheckoutSchema line details", () => {
  const line = { productId: VEST, color: "Navy", quantity: 6 };
  const parse = (extra: Record<string, unknown>) =>
    cartCheckoutSchema.safeParse({ ...contact, items: [{ ...line, ...extra }] });

  it("accepts optional sizes and imprint notes, trimmed", () => {
    const parsed = parse({ sizes: "  2 M, 4 L ", imprintNotes: "Left chest, white ink" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items[0].sizes).toBe("2 M, 4 L");
      expect(parsed.data.items[0].imprintNotes).toBe("Left chest, white ink");
    }
  });

  it("still accepts a line with neither", () => {
    expect(parse({}).success).toBe(true);
  });

  it("allows exactly 300 characters and rejects 301 with a specific message", () => {
    expect(parse({ sizes: "x".repeat(300), imprintNotes: "y".repeat(300) }).success).toBe(true);
    const tooLongSizes = parse({ sizes: "x".repeat(301) });
    expect(tooLongSizes.success).toBe(false);
    if (!tooLongSizes.success) {
      expect(tooLongSizes.error.issues[0].message).toBe(
        "Keep sizes and quantities under 300 characters."
      );
    }
    const tooLongImprint = parse({ imprintNotes: "y".repeat(301) });
    expect(tooLongImprint.success).toBe(false);
    if (!tooLongImprint.success) {
      expect(tooLongImprint.error.issues[0].message).toBe(
        "Keep imprint notes under 300 characters."
      );
    }
  });

  it("rejects non-text values", () => {
    expect(parse({ sizes: 12 }).success).toBe(false);
    expect(parse({ imprintNotes: ["a"] }).success).toBe(false);
  });
});

describe("POST /api/merchant/cart-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.verifyTurnstileToken.mockResolvedValue(true);
    mocks.recordSubmission.mockResolvedValue(42);
    mocks.sendCartOrderNotification.mockResolvedValue({ sent: true });
    mocks.sendMerchRequestConfirmation.mockResolvedValue({ sent: true });
  });

  it("saves the chosen color on every line and stamps the internal ESP fields", async () => {
    const response = await post([
      { productId: VEST, color: "Navy", quantity: 6 },
      { productId: VEST, color: "Black", quantity: 6 },
      { productId: "plain-test-item", quantity: 10 },
    ]);
    expect(response.status).toBe(200);

    expect(mocks.recordSubmission).toHaveBeenCalledTimes(1);
    const [type, data] = mocks.recordSubmission.mock.calls[0];
    expect(type).toBe("merch_order");
    const items = data.items as Record<string, unknown>[];
    expect(items.map((item) => item.color)).toEqual(["Navy", "Black", undefined]);
    // ESP lookups are stamped server-side on every line, colored or not.
    for (const item of items) {
      expect(String(item.espUrl)).toContain("espplus.com/products");
      expect(["product", "search"]).toContain(item.espKind);
    }
    // Colorless line stores no color key at all.
    expect("color" in items[2]).toBe(false);

    // The same priced lines go to the business notification.
    const payload = mocks.sendCartOrderNotification.mock.calls[0][0];
    expect(payload.items.map((item: { color?: string }) => item.color)).toEqual([
      "Navy",
      "Black",
      undefined,
    ]);
  });

  it("prices every color line at the tier set by the product's total quantity", async () => {
    // 6 + 6 = 12 units -> 12+ tier for both lines (alone each would be the 6+ tier).
    await post([
      { productId: VEST, color: "Navy", quantity: 6 },
      { productId: VEST, color: "Black", quantity: 6 },
    ]);
    const items = mocks.recordSubmission.mock.calls[0][1].items as {
      unitPrice: number;
      lineTotal: number;
    }[];
    expect(items[0].unitPrice).toBe(items[1].unitPrice);
    expect(items[0].lineTotal).toBeCloseTo(items[0].unitPrice * 6, 2);

    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.verifyTurnstileToken.mockResolvedValue(true);
    mocks.recordSubmission.mockResolvedValue(43);
    mocks.sendCartOrderNotification.mockResolvedValue({ sent: true });
    mocks.sendMerchRequestConfirmation.mockResolvedValue({ sent: true });
    await post([{ productId: VEST, color: "Navy", quantity: 6 }]);
    const single = mocks.recordSubmission.mock.calls[0][1].items as { unitPrice: number }[];
    expect(single[0].unitPrice).toBeGreaterThan(items[0].unitPrice);
  });

  it("rejects a color the product does not have, naming the product", async () => {
    const response = await post([{ productId: VEST, color: "Hot Pink", quantity: 6 }]);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Hot Pink");
    expect(body.error).toContain("Galway");
    expect(mocks.recordSubmission).not.toHaveBeenCalled();
    expect(mocks.sendCartOrderNotification).not.toHaveBeenCalled();
  });

  it("rejects a missing color on a product that has colors", async () => {
    const response = await post([{ productId: VEST, quantity: 6 }]);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Please choose a color");
    expect(mocks.recordSubmission).not.toHaveBeenCalled();
  });

  it("is case-sensitive: the color must equal one of the product's colors exactly", async () => {
    const response = await post([
      { productId: VEST, color: VEST_COLORS[3].toLowerCase(), quantity: 6 },
    ]);
    expect(response.status).toBe(400);
  });

  it("rejects a color on a product with no colors", async () => {
    const response = await post([{ productId: "plain-test-item", color: "Red", quantity: 10 }]);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Plain Test Item");
  });

  it("enforces the minimum order on the product's total across colors", async () => {
    const response = await post([
      { productId: VEST, color: "Navy", quantity: 3 },
      { productId: VEST, color: "Black", quantity: 2 },
    ]);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Minimum order");
    expect(mocks.recordSubmission).not.toHaveBeenCalled();

    const ok = await post([
      { productId: VEST, color: "Navy", quantity: 3 },
      { productId: VEST, color: "Black", quantity: 3 },
    ]);
    expect(ok.status).toBe(200);
  });

  it("rejects unknown products", async () => {
    const response = await post([{ productId: "nope", quantity: 5 }]);
    expect(response.status).toBe(400);
  });

  it("never returns ESP data to the browser", async () => {
    const response = await post([{ productId: VEST, color: "Navy", quantity: 6 }]);
    const text = JSON.stringify(await response.json()).toLowerCase();
    expect(text).not.toContain("esp");
  });
});

describe("POST /api/merchant/cart-checkout: customer confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.verifyTurnstileToken.mockResolvedValue(true);
    mocks.recordSubmission.mockResolvedValue(42);
    mocks.sendCartOrderNotification.mockResolvedValue({ sent: true });
    mocks.sendMerchRequestConfirmation.mockResolvedValue({ sent: true });
  });

  const cart = [
    { productId: VEST, color: "Navy", quantity: 6 },
    { productId: VEST, color: "Black", quantity: 6 },
  ];

  it("sends the confirmation after the submission is recorded, with the formatted reference", async () => {
    const order: string[] = [];
    mocks.recordSubmission.mockImplementation(async () => {
      order.push("record");
      return 42;
    });
    mocks.sendCartOrderNotification.mockImplementation(async () => {
      order.push("notify");
      return { sent: true };
    });
    mocks.sendMerchRequestConfirmation.mockImplementation(async () => {
      order.push("confirm");
      return { sent: true };
    });

    const response = await post(cart);
    expect(response.status).toBe(200);
    expect(order).toEqual(["record", "notify", "confirm"]);

    const body = await response.json();
    expect(body).toEqual({ success: true, orderRef: "MG-00042", confirmationEmailed: true });

    // The same reference goes to the business notification and the customer.
    expect(mocks.sendCartOrderNotification.mock.calls[0][0].orderRef).toBe("MG-00042");
    const confirmation = mocks.sendMerchRequestConfirmation.mock.calls[0][0];
    expect(confirmation.orderRef).toBe("MG-00042");
    expect(confirmation.email).toBe("pat@example.com");
    expect(confirmation.firstName).toBe("Pat");
    expect(confirmation.items).toHaveLength(2);
    expect(confirmation.total).toBeCloseTo(
      confirmation.items.reduce(
        (sum: number, item: { lineTotal: number }) => sum + item.lineTotal,
        0
      ),
      2
    );
  });

  it("gives the customer only customer-safe fields on each line", async () => {
    await post(cart);
    const { items } = mocks.sendMerchRequestConfirmation.mock.calls[0][0];
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(
        ["color", "lineTotal", "name", "quantity", "unitPrice"].sort()
      );
    }
  });

  it("still succeeds when the confirmation email throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.sendMerchRequestConfirmation.mockRejectedValue(new Error("resend exploded"));

    const response = await post(cart);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      orderRef: "MG-00042",
      confirmationEmailed: false,
    });
    expect(mocks.recordSubmission).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("still succeeds when the confirmation reports not sent", async () => {
    mocks.sendMerchRequestConfirmation.mockResolvedValue({ sent: false, reason: "not_configured" });
    const response = await post(cart);
    expect(response.status).toBe(200);
    expect((await response.json()).confirmationEmailed).toBe(false);
  });

  it("omits the reference when the order could not be saved, but still notifies and confirms", async () => {
    mocks.recordSubmission.mockResolvedValue(undefined);
    const response = await post(cart);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.orderRef).toBeUndefined();
    expect(mocks.sendCartOrderNotification.mock.calls[0][0].orderRef).toBeUndefined();
    expect(mocks.sendMerchRequestConfirmation.mock.calls[0][0].orderRef).toBeUndefined();
  });

  it("does not confirm to the customer when the business notification fails", async () => {
    mocks.sendCartOrderNotification.mockResolvedValue({ sent: false, reason: "not_configured" });
    const response = await post(cart);
    expect(response.status).toBe(503);
    expect(mocks.sendMerchRequestConfirmation).not.toHaveBeenCalled();
  });

  it("does not send a confirmation for a rejected cart", async () => {
    const response = await post([{ productId: VEST, color: "Hot Pink", quantity: 6 }]);
    expect(response.status).toBe(400);
    expect(mocks.sendMerchRequestConfirmation).not.toHaveBeenCalled();
  });

  it("stores sizes and imprint notes on the line and passes them to both emails", async () => {
    const response = await post([
      {
        productId: VEST,
        color: "Navy",
        quantity: 6,
        sizes: " 2 M, 4 L ",
        imprintNotes: "Left chest, white ink",
      },
      { productId: "plain-test-item", quantity: 10, sizes: "   ", imprintNotes: "" },
    ]);
    expect(response.status).toBe(200);

    const items = mocks.recordSubmission.mock.calls[0][1].items as Record<string, unknown>[];
    expect(items[0]).toMatchObject({ sizes: "2 M, 4 L", imprintNotes: "Left chest, white ink" });
    // Blank text is not stored at all.
    expect(items[1]).not.toHaveProperty("sizes");
    expect(items[1]).not.toHaveProperty("imprintNotes");

    const notified = mocks.sendCartOrderNotification.mock.calls[0][0].items;
    expect(notified[0]).toMatchObject({ sizes: "2 M, 4 L", imprintNotes: "Left chest, white ink" });
    const confirmed = mocks.sendMerchRequestConfirmation.mock.calls[0][0].items;
    expect(confirmed[0]).toMatchObject({
      sizes: "2 M, 4 L",
      imprintNotes: "Left chest, white ink",
    });
    expect(confirmed[1]).not.toHaveProperty("sizes");
  });

  it("rejects over-long sizes with a 400 that names the field's problem", async () => {
    const response = await post([
      { productId: VEST, color: "Navy", quantity: 6, sizes: "x".repeat(301) },
    ]);
    expect(response.status).toBe(400);
    expect(JSON.stringify((await response.json()).issues)).toContain("under 300 characters");
    expect(mocks.recordSubmission).not.toHaveBeenCalled();
  });

  it("never prints a configuration reason: the 503 and 500 use the generic message with real contact details", async () => {
    const generic =
      "We couldn't send your request. Please email ben@magnoliagrovega.com or call (706) 573-1719.";
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.sendCartOrderNotification.mockResolvedValue({ sent: false, reason: "not_configured" });
    const notConfigured = await post(cart);
    expect(notConfigured.status).toBe(503);
    expect((await notConfigured.json()).error).toBe(generic);
    // The real reason is kept for the server log.
    expect(errorLog.mock.calls.flat().join(" ")).toContain("not_configured");

    mocks.sendCartOrderNotification.mockRejectedValue(new Error("db password rejected"));
    const failed = await post(cart);
    expect(failed.status).toBe(500);
    const body = await failed.json();
    expect(body.error).toBe(generic);
    expect(JSON.stringify(body)).not.toContain("password");
    errorLog.mockRestore();
  });
});
