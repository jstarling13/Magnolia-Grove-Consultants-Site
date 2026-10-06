// @vitest-environment node
/**
 * End-to-end merch order lifecycle, run against the real application code with
 * only the outside world faked:
 *
 *   database        -> FakeSubmissionsDb (strict, stateful, understands jsonb ops)
 *   email           -> Resend client replaced by EmailOutbox (inspect to/subject/html)
 *   Square/Turnstile-> FakeSquare behind a stubbed global fetch
 *   admin session   -> real signed cookie tokens, real verifySessionToken
 *   clock           -> Date frozen at START_TIME and advanced explicitly
 *
 * Unit tests elsewhere mock these pieces one at a time; this file proves the
 * pieces agree with each other across the whole life of an order.
 *
 * Tests marked `it.fails("BUG: ...")` document a real defect found while
 * writing this suite: the body states the CORRECT expectation, vitest inverts
 * the result, and the test starts reporting "unexpectedly passed" the moment
 * the bug is fixed, which is the cue to turn it into a plain `it`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { createResendModuleMock, htmlText, type CapturedEmail } from "../helpers/emailOutbox";
import {
  ADMIN_COOKIE_NAME,
  BACKEND_LEAK_PATTERN,
  BUSINESS_INBOX,
  CUSTOMER,
  DAY_MS,
  DEFAULT_CART,
  DEFAULT_CART_TOTAL,
  DEFAULT_CART_UNITS,
  DEFAULT_QUOTE,
  POLO_ID,
  SITE_URL,
  START_TIME,
  UMBRELLA_ID,
  UMBRELLA_NAME,
  VEST_ID,
  advanceClock,
  backendValuesOf,
  beginTest,
  cartBody,
  cartRequest,
  customerPays,
  deliverWebhook,
  endTest,
  loadApp,
  placeOrder,
  quoteOrder,
  squareEventBody,
  squareSignature,
  webhookRequest,
  world,
  type App,
  type CartLine,
} from "../helpers/lifecycleHarness";

// Only the edges are mocked; every factory delegates to `world` lazily so each
// test gets a fresh database / outbox / Square.
vi.mock("@/lib/db", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => world.db.sql(strings, ...values),
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (identifier: string) => world.limiter.check(identifier),
}));
vi.mock("resend", () => createResendModuleMock(() => world.outbox));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === ADMIN_COOKIE_NAME && world.adminCookie
        ? { name, value: world.adminCookie }
        : undefined,
  }),
}));

let app: App;

beforeEach(async () => {
  beginTest();
  app = await loadApp();
});
afterEach(endTest);

// ---------------------------------------------------------------------------
// Small local helpers
// ---------------------------------------------------------------------------

const receiptsTo = (email: string) =>
  world.outbox.delivered.filter((e) => e.to === email && /^Payment received/.test(e.subject));

const shippedTo = (email: string) =>
  world.outbox.delivered.filter((e) => e.to === email && /^Your order has shipped/.test(e.subject));

function customerSafe(email: CapturedEmail, backendValues: string[] = []): void {
  const label = `customer email "${email.subject}" to ${email.to}`;
  const visible = `${email.subject}\n${email.html}`;
  const hit = BACKEND_LEAK_PATTERN.exec(visible);
  expect(hit, `${label} leaks the backend-only term "${hit?.[0]}"`).toBeNull();
  for (const value of backendValues) {
    expect(
      visible.toLowerCase().includes(value.toLowerCase()),
      `${label} contains the stamped backend value ${JSON.stringify(value)}`
    ).toBe(false);
  }
}

/** Seeds a merch order straight into the fake table (for states that are tedious to reach). */
function seedOrder(overrides: Record<string, unknown> = {}): number {
  return world.db.seed("merch_order", {
    ...CUSTOMER,
    status: "new",
    total: DEFAULT_CART_TOTAL,
    items: [
      {
        productId: UMBRELLA_ID,
        name: UMBRELLA_NAME,
        color: "Black",
        quantity: 24,
        unitPrice: 14.79,
        lineTotal: 354.96,
        espUrl: "https://espplus.com/products/551848490",
        espKind: "product",
        supplier: "Prime Line",
        asi: "asi/79530",
        productNo: "OD205",
      },
    ],
    ...overrides,
  });
}

/** The state an order is in once Square has been paid and the webhook has run. */
async function paidThroughSquare(overrides: Record<string, unknown> = {}) {
  const order = await placeOrder(app, overrides);
  await quoteOrder(app, order.id);
  customerPays(order.id);
  const response = await deliverWebhook(app);
  expect(response.status).toBe(200);
  expect(world.db.data(order.id).status, "precondition: order is paid").toBe("paid");
  return order;
}

async function jsonOf(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

// ===========================================================================
// (1) Cart -> cart-checkout route
// ===========================================================================

describe("1. cart-checkout route", () => {
  describe("happy path: the same product in two colors", () => {
    it("stores one priced line per color at the shared quantity tier", async () => {
      const order = await placeOrder(app);
      expect(order).toEqual({ id: 1, orderRef: "MG-00001" });

      const data = world.db.data(order.id);
      expect(data).toMatchObject({
        status: "new",
        firstName: "Pat",
        lastName: "Lee",
        email: "pat@customer.test",
        quantity: String(DEFAULT_CART_UNITS),
        total: DEFAULT_CART_TOTAL,
      });

      const items = data.items as Record<string, unknown>[];
      expect(items).toHaveLength(4);
      // 24 + 48 = 72 umbrellas reaches the 72-unit tier ($14.79) for BOTH color lines;
      // 24 alone would have been $15.21.
      expect(items[0]).toMatchObject({
        productId: UMBRELLA_ID,
        name: UMBRELLA_NAME,
        color: "Black",
        quantity: 24,
        unitPrice: 14.79,
        lineTotal: 354.96,
      });
      expect(items[1]).toMatchObject({
        productId: UMBRELLA_ID,
        color: "Blue-Reflex",
        quantity: 48,
        unitPrice: 14.79,
        lineTotal: 709.92,
      });
      expect(items[2]).toMatchObject({
        productId: POLO_ID,
        color: "Navy",
        quantity: 3,
        unitPrice: 58.82,
        lineTotal: 176.46,
      });
      expect(items[3]).toMatchObject({
        productId: VEST_ID,
        color: "Iron",
        quantity: 6,
        unitPrice: 156.57,
        lineTotal: 939.42,
      });
    });

    it("stamps the ESP fields server-side from our own catalog ids", async () => {
      const order = await placeOrder(app);
      const items = world.db.data(order.id).items as Record<string, unknown>[];

      expect(items[0]).toMatchObject({
        espUrl: "https://espplus.com/products/551848490",
        espKind: "product",
        supplier: "Prime Line",
        asi: "asi/79530",
        productNo: "OD205",
      });
      expect(items[1]).toMatchObject({ espUrl: items[0].espUrl, supplier: "Prime Line" });
      expect(items[2]).toMatchObject({
        espUrl: "https://espplus.com/products/553421569",
        supplier: "SanMar",
        productNo: "NKDC1963",
      });
      // No ESP id on file for the vest: it gets a search link and no supplier fields.
      expect(items[3]).toMatchObject({ espKind: "search" });
      expect(String(items[3].espUrl)).toMatch(/^https:\/\/espplus\.com\/products\?q=/);
      expect(items[3]).not.toHaveProperty("supplier");
      expect(items[3]).not.toHaveProperty("productNo");
    });

    it("ignores client-supplied prices, totals and ESP fields", async () => {
      const forged = DEFAULT_CART.map((line) => ({
        ...line,
        unitPrice: 0.01,
        lineTotal: 0.01,
        espUrl: "https://evil.test/steal",
        supplier: "Evil Corp",
        productNo: "FORGED-1",
      }));
      const order = await placeOrder(app, { items: forged, total: 1, status: "paid" });
      const data = world.db.data(order.id);

      expect(data.total).toBe(DEFAULT_CART_TOTAL);
      expect(data.status).toBe("new");
      for (const item of data.items as Record<string, unknown>[]) {
        expect(item.unitPrice).not.toBe(0.01);
        expect(String(item.espUrl)).toMatch(/^https:\/\/espplus\.com\//);
        expect(item.supplier).not.toBe("Evil Corp");
        expect(item.productNo).not.toBe("FORGED-1");
      }
    });

    it("answers with only the order reference, never backend data", async () => {
      const response = await app.checkout(cartRequest(cartBody()));
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(JSON.parse(text)).toEqual({
        success: true,
        orderRef: "MG-00001",
        confirmationEmailed: true,
      });
      expect(text).not.toMatch(BACKEND_LEAK_PATTERN);
    });

    it("emails the business the ESP links, suppliers, product numbers and colors", async () => {
      const order = await placeOrder(app, { notes: "Rush if possible" });
      expect(world.outbox.toBusiness).toHaveLength(1);
      const [mail] = world.outbox.toBusiness;

      expect(mail.subject).toBe(
        `New Merch Cart Order ${order.orderRef} — Pat Lee (4 items, $${DEFAULT_CART_TOTAL.toFixed(2)})`
      );
      expect(mail.replyTo).toBe("pat@customer.test");
      expect(mail.from).toContain("orders@mg-test.invalid");

      const html = mail.html;
      expect(html).toContain('href="https://espplus.com/products/551848490"');
      expect(html).toContain('href="https://espplus.com/products/553421569"');
      expect(html).toContain("Open in ESP+ (search link)"); // the vest
      expect(html).toContain("Supplier: Prime Line");
      expect(html).toContain("Product no. OD205");
      expect(html).toContain("Supplier: SanMar");
      expect(html).toContain("Product no. NKDC1963");
      for (const color of ["Black", "Blue-Reflex", "Navy", "Iron"]) {
        expect(html).toContain(`Color: ${color}`);
      }
      expect(html).toContain("60&quot; Arc Jumbo Golf Umbrella"); // catalog name with a quote, escaped
      expect(html).toContain(`$${DEFAULT_CART_TOTAL.toFixed(2)}`);
      expect(html).toContain("Rush if possible");
    });

    it("sends the customer a confirmation with colors and prices but NO ESP or supplier data", async () => {
      const order = await placeOrder(app);
      expect(world.outbox.toCustomers).toHaveLength(1);
      const [mail] = world.outbox.toCustomers;

      expect(mail.to).toBe("pat@customer.test");
      expect(mail.replyTo).toBe(BUSINESS_INBOX);
      expect(mail.subject).toBe(`We received your merchandise request — ${order.orderRef}`);
      for (const color of ["Black", "Blue-Reflex", "Navy", "Iron"]) {
        expect(mail.html).toContain(color);
      }
      expect(mail.html).toContain("$14.79");
      expect(mail.html).toContain(`$${DEFAULT_CART_TOTAL.toFixed(2)}`);
      expect(mail.html).toContain("Nothing has been charged");
      customerSafe(mail, backendValuesOf(world.db.data(order.id)));
    });

    it("minimum order is counted across colors (12 + 12 meets the 24-unit minimum)", async () => {
      const response = await app.checkout(
        cartRequest(
          cartBody({
            items: [
              { productId: UMBRELLA_ID, color: "Black", quantity: 12 },
              { productId: UMBRELLA_ID, color: "Blue-Reflex", quantity: 12 },
            ],
          })
        )
      );
      expect(response.status).toBe(200);
      const items = world.db.data(1).items as Record<string, unknown>[];
      expect(items.map((i) => i.unitPrice)).toEqual([15.21, 15.21]); // 24-unit tier
    });
  });

  describe("rejected carts store nothing and send nothing", () => {
    const rejected: [string, CartLine[], RegExp][] = [
      [
        "a color that isn't offered",
        [{ productId: UMBRELLA_ID, color: "Chartreuse", quantity: 24 }],
        /"Chartreuse" is not an available color/,
      ],
      [
        "a color with the wrong case (colors must match exactly)",
        [{ productId: UMBRELLA_ID, color: "black", quantity: 24 }],
        /"black" is not an available color/,
      ],
      [
        "no color on a colored product",
        [{ productId: UMBRELLA_ID, quantity: 24 }],
        /Please choose a color for/,
      ],
      [
        "a blank color on a colored product",
        [{ productId: UMBRELLA_ID, color: "   ", quantity: 24 }],
        /Please choose a color for/,
      ],
      [
        "a quantity below the product minimum",
        [{ productId: UMBRELLA_ID, color: "Black", quantity: 10 }],
        /Minimum order for .* is 24 units \(you have 10\)/,
      ],
      [
        "one good line and one line missing its color",
        [
          { productId: POLO_ID, color: "Navy", quantity: 3 },
          { productId: VEST_ID, quantity: 6 },
        ],
        /Please choose a color for/,
      ],
      [
        "a product that does not exist",
        [{ productId: "no-such-product", color: "Black", quantity: 24 }],
        /no longer available/,
      ],
    ];

    it.each(rejected)("%s -> 400", async (_name, items, message) => {
      const response = await app.checkout(cartRequest(cartBody({ items })));
      const json = await jsonOf(response);
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(String(json.error)).toMatch(message);

      expect(world.db.rows.size, "no submission may be stored").toBe(0);
      expect(world.outbox.attempts, "no email may be attempted").toHaveLength(0);
    });

    it.each([
      ["an empty cart", { items: [] }],
      ["a zero quantity", { items: [{ productId: POLO_ID, color: "Navy", quantity: 0 }] }],
      ["a fractional quantity", { items: [{ productId: POLO_ID, color: "Navy", quantity: 1.5 }] }],
      ["a negative quantity", { items: [{ productId: POLO_ID, color: "Navy", quantity: -3 }] }],
      ["an invalid email address", { email: "not-an-email" }],
      ["a missing last name", { lastName: "" }],
    ])("%s -> 400 validation error", async (_name, override) => {
      const response = await app.checkout(cartRequest(cartBody(override)));
      expect(response.status).toBe(400);
      expect(await jsonOf(response)).toMatchObject({ success: false, error: "Validation failed." });
      expect(world.db.rows.size).toBe(0);
      expect(world.outbox.attempts).toHaveLength(0);
    });

    it("a body that is not JSON -> 400", async () => {
      const response = await app.checkout(
        new NextRequest("http://localhost/api/merchant/cart-checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{not json",
        })
      );
      expect(response.status).toBe(400);
      expect(await jsonOf(response)).toMatchObject({ error: "Invalid request body." });
    });
  });

  describe("abuse protection", () => {
    it("honeypot submissions are stored nowhere and emailed nowhere", async () => {
      const response = await app.checkout(
        cartRequest(cartBody({ company_website: "http://spam.test" }))
      );
      expect([200, 400]).toContain(response.status);
      expect(world.db.rows.size).toBe(0);
      expect(world.outbox.attempts).toHaveLength(0);
      expect(world.square.calls, "bots are stopped before any outbound call").toHaveLength(0);
    });

    it("a filled honeypot gets the intended fake success, not a 400", async () => {
      const response = await app.checkout(
        cartRequest(cartBody({ company_website: "http://spam.test" }))
      );
      // Intended (see the comment in the route): 200 { success: true } so the bot doesn't learn
      // it was caught. Actual: cartCheckoutSchema's honeypot field is `.max(0)`, so zod rejects
      // the body first and the bot sees 400 "Validation failed" with a "Bot detected" issue.
      // Fix: make the schema field a plain optional string and keep the explicit check in the
      // route (or check the raw body's company_website before parsing).
      expect(response.status).toBe(200);
      expect(await jsonOf(response)).toEqual({ success: true });
    });

    it("Turnstile rejection -> 400, nothing stored or sent", async () => {
      const response = await app.checkout(cartRequest(cartBody({ turnstileToken: "bot-token" })));
      expect(response.status).toBe(400);
      expect(await jsonOf(response)).toMatchObject({
        success: false,
        error: expect.stringContaining("CAPTCHA verification failed"),
      });
      expect(world.db.rows.size).toBe(0);
      expect(world.outbox.attempts).toHaveLength(0);
    });

    it("a missing Turnstile token is rejected when Turnstile is configured", async () => {
      const response = await app.checkout(cartRequest(cartBody({ turnstileToken: undefined })));
      expect(response.status).toBe(400);
      expect(world.db.rows.size).toBe(0);
    });

    it("Turnstile is skipped (and no token needed) when it is not configured", async () => {
      app = await loadApp({ turnstile: false });
      const response = await app.checkout(cartRequest(cartBody({ turnstileToken: undefined })));
      expect(response.status).toBe(200);
      expect(world.db.rows.size).toBe(1);
    });

    it("rate limit: the 6th request from one IP is a 429, other IPs are unaffected", async () => {
      const bodyFor = (n: number) => ({ ...cartBody(), email: `pat${n}@example.com` });
      for (let i = 0; i < 5; i++) {
        const ok = await app.checkout(cartRequest(bodyFor(i), { ip: "198.51.100.9" }));
        expect(ok.status, `request ${i + 1} should pass`).toBe(200);
      }
      const limited = await app.checkout(cartRequest(bodyFor(5), { ip: "198.51.100.9" }));
      expect(limited.status).toBe(429);
      expect(await jsonOf(limited)).toMatchObject({ success: false });
      expect(world.db.rows.size, "the limited request stored nothing").toBe(5);

      // The limiter runs before the body is even read.
      const badBody = await app.checkout(
        new NextRequest("http://localhost/api/merchant/cart-checkout", {
          method: "POST",
          headers: { "x-forwarded-for": "198.51.100.9" },
          body: "garbage",
        })
      );
      expect(badBody.status).toBe(429);

      const other = await app.checkout(cartRequest(bodyFor(6), { ip: "198.51.100.77" }));
      expect(other.status).toBe(200);
    });
  });

  describe("degraded infrastructure", () => {
    it("a database write failure still emails both sides, just without an order reference", async () => {
      world.db.failNext(/^INSERT INTO submissions/);
      const response = await app.checkout(cartRequest(cartBody()));
      expect(response.status).toBe(200);
      expect(await jsonOf(response)).toEqual({ success: true, confirmationEmailed: true });
      expect(world.db.rows.size).toBe(0);
      expect(world.outbox.toBusiness[0].subject).toBe(
        `New Merch Cart Order — Pat Lee (4 items, $${DEFAULT_CART_TOTAL.toFixed(2)})`
      );
      expect(world.outbox.toCustomers[0].subject).toBe("We received your merchandise request");
    });

    it("a rejected customer confirmation never fails the order", async () => {
      world.outbox.rejectNext({ when: (e) => e.to === CUSTOMER.email });
      const response = await app.checkout(cartRequest(cartBody()));
      expect(response.status).toBe(200);
      expect(await jsonOf(response)).toMatchObject({
        success: true,
        orderRef: "MG-00001",
        confirmationEmailed: false,
      });
      expect(world.db.rows.size).toBe(1);
      expect(world.outbox.toBusiness).toHaveLength(1);
    });

    it("email not configured -> 503 (the business could not be notified)", async () => {
      app = await loadApp({ resend: false });
      const response = await app.checkout(cartRequest(cartBody()));
      expect(response.status).toBe(503);
      expect(await jsonOf(response)).toMatchObject({
        error: "Email delivery is not configured yet.",
      });
    });
  });
});

// ===========================================================================
// (2) Admin quotes and sends the payment link
// ===========================================================================

describe("2. admin quote and payment link", () => {
  describe("authorization", () => {
    function forgedToken(secret: string, username = "ben", exp = Date.now() + DAY_MS): string {
      const payload = Buffer.from(JSON.stringify({ username, exp })).toString("base64url");
      return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
    }

    const signedOutStates: [string, (a: App) => void][] = [
      ["no session cookie", () => (world.adminCookie = undefined)],
      ["a garbage cookie", () => (world.adminCookie = "not-a-token")],
      [
        "a token signed with the wrong secret",
        () => (world.adminCookie = forgedToken("some-other-secret")),
      ],
      [
        "a real token with its payload swapped for another user",
        (a) => {
          const real = a.createAdminToken("ben");
          const swapped = Buffer.from(
            JSON.stringify({ username: "mallory", exp: Date.now() + DAY_MS })
          ).toString("base64url");
          world.adminCookie = `${swapped}.${real.split(".")[1]}`;
        },
      ],
      [
        "a genuine session that was revoked by signing out",
        (a) => {
          world.adminCookie = a.createAdminToken("ben");
          advanceClock(1000);
          // What POST /api/admin/logout records (see adminSessions.ts).
          world.db.revocations.set("ben", Date.now());
        },
      ],
      [
        "an expired session (8 days old)",
        (a) => {
          world.adminCookie = a.createAdminToken("ben");
          advanceClock(8 * DAY_MS);
        },
      ],
    ];

    describe.each(signedOutStates)("with %s", (_label, setUp) => {
      it("every money / customer-email / supplier action is refused and changes nothing", async () => {
        const id = seedOrder({ status: "quoted", paidAt: START_TIME, quotedTotal: 100 });
        const before = world.db.data(id);
        setUp(app);

        const results = await Promise.all([
          app.actions.updateMerchOrderStatus(id, "paid"),
          app.actions.sendMerchPaymentLink(id, 100),
          app.actions.recordEspOrder(id, "PO-1"),
          app.actions.markMerchShipped(id, {
            carrier: "UPS",
            trackingNumber: "1Z999AA10123456784",
          }),
        ]);

        for (const result of results) {
          expect(result).toEqual({ ok: false, error: "Not authorized." });
        }
        expect(world.db.data(id)).toEqual(before);
        expect(world.outbox.attempts, "no email may go out").toHaveLength(0);
        expect(world.square.apiCalls(), "no Square call may be made").toHaveLength(0);
      });
    });

    it("control: the same actions work with a valid session", async () => {
      const id = seedOrder({ status: "quoted", paidAt: START_TIME, quotedTotal: 100 });
      app.signInAsAdmin();
      expect(await app.actions.updateMerchOrderStatus(id, "reviewing")).toEqual({ ok: true });
      expect(world.db.data(id).status).toBe("reviewing");
    });

    // Server actions are public POST endpoints, so each one has to check the session itself.
    it("markSubmissionRead requires an admin session", async () => {
      const id = world.db.seed("lead", { firstName: "Casey", email: "casey@customer.test" });
      app.signOut();
      await app.actions.markSubmissionRead(id);
      // Expected: an anonymous caller cannot change dashboard state.
      // Actual: read_at gets stamped. Fix: add `if (!(await isAdminSession())) return;` first.
      expect(world.db.rows.get(id)!.read_at).toBeNull();
    });
  });

  describe("sending the link", () => {
    let order: { id: number; orderRef: string };

    beforeEach(async () => {
      order = await placeOrder(app);
      world.outbox.clear();
      app.signInAsAdmin();
    });

    it("creates a Square link for the exact quoted cents and moves the order to awaiting_payment", async () => {
      const result = await app.actions.sendMerchPaymentLink(order.id, DEFAULT_QUOTE);
      expect(result).toEqual({
        ok: true,
        url: "https://checkout.square.test/pay/LINK_FAKE_1",
        emailed: true,
      });

      expect(world.square.linkCreateCalls()).toHaveLength(1);
      expect(world.square.links.get("LINK_FAKE_1")).toMatchObject({
        amountCents: 245050,
        currency: "USD",
        buyerEmail: "pat@customer.test",
        locationId: "LOCATION_FAKE_1",
        name: "Pat Lee — Merchandise order MG-00001",
        redirectUrl: `${SITE_URL}/thank-you?source=merch`, // no customer email in the URL
      });

      const data = world.db.data(order.id);
      expect(data).toMatchObject({
        status: "awaiting_payment",
        quotedTotal: 2450.5,
        quotedAt: START_TIME,
        paymentLinkId: "LINK_FAKE_1",
        paymentUrl: "https://checkout.square.test/pay/LINK_FAKE_1",
        total: DEFAULT_CART_TOTAL, // the original estimate is kept
      });
      expect(data.items, "line items (with colors) survive the quote").toHaveLength(4);
    });

    it("emails the customer the quote and link, with no backend data", async () => {
      await app.actions.sendMerchPaymentLink(order.id, DEFAULT_QUOTE);
      expect(world.outbox.toCustomers).toHaveLength(1);
      const [mail] = world.outbox.toCustomers;
      expect(mail.to).toBe("pat@customer.test");
      expect(mail.subject).toBe(`Your Merchandise Quote Is Ready — ${order.orderRef}`);
      expect(mail.html).toContain("$2450.50");
      expect(mail.html).toContain('href="https://checkout.square.test/pay/LINK_FAKE_1"');
      customerSafe(mail, backendValuesOf(world.db.data(order.id)));
    });

    it.each([
      ["zero", 0],
      ["negative", -5],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["above the $250,000 invoicing limit", 250_000.01],
    ])("rejects a quote of %s without calling Square", async (_label, amount) => {
      const result = await app.actions.sendMerchPaymentLink(order.id, amount);
      expect(result.ok).toBe(false);
      expect(world.square.apiCalls()).toHaveLength(0);
      expect(world.db.data(order.id).status).toBe("new");
      expect(world.outbox.attempts).toHaveLength(0);
    });

    it("unknown orders, and rows that are not merch orders, are 'not found'", async () => {
      expect(await app.actions.sendMerchPaymentLink(999, 100)).toEqual({
        ok: false,
        error: "Order not found.",
      });
      const leadId = world.db.seed("lead", { email: "x@y.test", status: "new" });
      expect(await app.actions.sendMerchPaymentLink(leadId, 100)).toEqual({
        ok: false,
        error: "Order not found.",
      });
      expect(world.square.apiCalls()).toHaveLength(0);
    });

    it("an order without a customer email cannot be quoted", async () => {
      const id = seedOrder({ email: "" });
      expect(await app.actions.sendMerchPaymentLink(id, 100)).toEqual({
        ok: false,
        error: "This order has no customer email.",
      });
      expect(world.square.apiCalls()).toHaveLength(0);
    });

    it("Square not configured: clear error, order untouched, nothing emailed", async () => {
      app = await loadApp({ square: false });
      app.signInAsAdmin();
      const result = await app.actions.sendMerchPaymentLink(order.id, DEFAULT_QUOTE);
      expect(result).toMatchObject({
        ok: false,
        error: expect.stringContaining("isn't configured"),
      });
      expect(world.db.data(order.id).status).toBe("new");
      expect(world.db.data(order.id)).not.toHaveProperty("paymentLinkId");
      expect(world.outbox.attempts).toHaveLength(0);
    });

    it("a Square API error leaves the order untouched and emails nothing", async () => {
      world.square.failNextCreate(500);
      const result = await app.actions.sendMerchPaymentLink(order.id, DEFAULT_QUOTE);
      expect(result).toMatchObject({
        ok: false,
        error: expect.stringContaining("couldn't create"),
      });
      expect(world.db.data(order.id).status).toBe("new");
      expect(world.outbox.attempts).toHaveLength(0);

      // ...and the admin can simply try again.
      const retry = await app.actions.sendMerchPaymentLink(order.id, DEFAULT_QUOTE);
      expect(retry.ok).toBe(true);
    });

    it("a failed quote email still saves the link and reports emailed: false", async () => {
      world.outbox.rejectNext({ when: (e) => /Quote Is Ready/.test(e.subject) });
      const result = await app.actions.sendMerchPaymentLink(order.id, DEFAULT_QUOTE);
      expect(result).toMatchObject({ ok: true, emailed: false });
      expect(world.db.data(order.id).status).toBe("awaiting_payment");
    });

    it.each([
      ["paid", "Paid"],
      ["ordered_in_esp", "Ordered in ESP"],
      ["fulfilled", "Fulfilled"],
      ["cancelled", "Cancelled"],
    ])("a %s order is locked: no new payment link", async (status, label) => {
      const id = seedOrder({ status, paidAt: START_TIME });
      const result = await app.actions.sendMerchPaymentLink(id, 500);
      expect(result).toEqual({ ok: false, error: `This order is already ${label}.` });
      expect(world.square.apiCalls()).toHaveLength(0);
      expect(world.db.data(id).status).toBe(status);
    });

    it("re-quoting an order that is still awaiting payment issues a new link", async () => {
      await app.actions.sendMerchPaymentLink(order.id, 1000);
      await app.actions.sendMerchPaymentLink(order.id, 1200);
      expect(world.db.data(order.id)).toMatchObject({
        paymentLinkId: "LINK_FAKE_2",
        quotedTotal: 1200,
      });
      expect(world.outbox.toCustomers).toHaveLength(2);
    });

    it("re-quoting deletes the old link at Square, so it can no longer be paid", async () => {
      await app.actions.sendMerchPaymentLink(order.id, 1000); // LINK_FAKE_1, emailed
      const result = await app.actions.sendMerchPaymentLink(order.id, 1200); // LINK_FAKE_2

      expect(result).toMatchObject({ ok: true });
      expect([...world.square.links.keys()], "only the new link is live at Square").toEqual([
        "LINK_FAKE_2",
      ]);
      expect(world.square.deletedLinkIds).toEqual(["LINK_FAKE_1"]);
      expect(() => world.square.payLink("LINK_FAKE_1")).toThrow(/no payment link/);

      const data = world.db.data(order.id);
      expect(data).toMatchObject({
        paymentLinkId: "LINK_FAKE_2",
        quotedTotal: 1200,
        supersededPaymentLinkIds: ["LINK_FAKE_1"],
      });

      // The new link is the one that completes the order.
      world.square.payLink("LINK_FAKE_2");
      await deliverWebhook(app);
      expect(world.db.data(order.id).status).toBe("paid");
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
    });

    it("if Square can't delete the old link, no second link survives and the order is unchanged", async () => {
      await app.actions.sendMerchPaymentLink(order.id, 1000);
      world.square.failDeletes = 1;
      const emailsBefore = world.outbox.toCustomers.length;

      const result = await app.actions.sendMerchPaymentLink(order.id, 1200);

      expect(result).toMatchObject({ ok: false });
      expect((result as { error: string }).error).toMatch(/previous payment link/i);
      expect([...world.square.links.keys()], "the new link is backed out").toEqual(["LINK_FAKE_1"]);
      expect(world.db.data(order.id)).toMatchObject({
        paymentLinkId: "LINK_FAKE_1",
        quotedTotal: 1000,
        status: "awaiting_payment",
      });
      expect(world.outbox.toCustomers).toHaveLength(emailsBefore);
    });

    it("a re-quote after the customer already paid the old link is refused and the order becomes paid", async () => {
      await app.actions.sendMerchPaymentLink(order.id, 1000);
      world.square.payLink("LINK_FAKE_1");

      const result = await app.actions.sendMerchPaymentLink(order.id, 1200);

      expect(result).toMatchObject({ ok: false });
      expect((result as { error: string }).error).toMatch(/already paid/i);
      expect(world.square.linkCreateCalls()).toHaveLength(1);
      expect(world.db.data(order.id).status).toBe("paid");
    });

    it("cancelling an awaiting-payment order deletes its payment link", async () => {
      await app.actions.sendMerchPaymentLink(order.id, 1000);
      const result = await app.actions.updateMerchOrderStatus(order.id, "cancelled");
      expect(result).toEqual({ ok: true });
      expect(world.square.deletedLinkIds).toEqual(["LINK_FAKE_1"]);
      expect(world.db.data(order.id).status).toBe("cancelled");
    });

    it("cancelling still works when Square can't delete the link, and warns the admin", async () => {
      await app.actions.sendMerchPaymentLink(order.id, 1000);
      world.square.failDeletes = 1;
      const result = await app.actions.updateMerchOrderStatus(order.id, "cancelled");
      expect(result).toMatchObject({ ok: true, warning: expect.stringMatching(/payment link/i) });
      expect(world.db.data(order.id).status).toBe("cancelled");
    });
  });
});

// ===========================================================================
// (3) Square webhook -> paid -> exactly one receipt
// ===========================================================================

describe("3. Square webhook, payment confirmation and receipts", () => {
  async function awaitingPayment(overrides: Record<string, unknown> = {}) {
    const order = await placeOrder(app, overrides);
    await quoteOrder(app, order.id);
    return order;
  }

  describe("signature and request gating", () => {
    it.each([
      ["no signature header", () => webhookRequest({ signature: null })],
      ["a wrong signature", () => webhookRequest({ signature: "AAAA" })],
      ["a signature made with the wrong key", () => webhookRequest({ key: "wrong-key" })],
      [
        "a signature made for a different notification URL",
        () => webhookRequest({ notificationUrl: "https://evil.test/hook" }),
      ],
      [
        "a body altered after signing",
        () =>
          webhookRequest({
            body: squareEventBody("payment.updated", "tampered"),
            signature: squareSignature(squareEventBody("payment.updated", "original")),
          }),
      ],
    ])("%s -> 403 and no database or Square activity", async (_label, build) => {
      const order = await awaitingPayment();
      customerPays(order.id);
      const queriesBefore = world.db.queries.length;
      const callsBefore = world.square.calls.length;

      const response = await app.webhook(build());

      expect(response.status).toBe(403);
      expect(world.db.queries.length, "no DB work before the signature checks out").toBe(
        queriesBefore
      );
      expect(world.square.calls.length).toBe(callsBefore);
      expect(world.db.data(order.id).status, "a forged event can never mark an order paid").toBe(
        "awaiting_payment"
      );
    });

    it("webhook env not configured -> 503", async () => {
      app = await loadApp({ webhookEnv: false });
      const response = await app.webhook(webhookRequest());
      expect(response.status).toBe(503);
    });

    it("a validly signed non-JSON body -> 400", async () => {
      const response = await app.webhook(webhookRequest({ body: "definitely not json" }));
      expect(response.status).toBe(400);
    });

    it("event types that cannot mean 'paid' are acknowledged and ignored", async () => {
      const order = await awaitingPayment();
      customerPays(order.id);
      const callsBefore = world.square.calls.length;
      const response = await deliverWebhook(app, "customer.created");
      expect(response.status).toBe(200);
      expect(await jsonOf(response)).toEqual({ received: true, ignored: true });
      expect(world.square.calls.length).toBe(callsBefore);
      expect(world.db.data(order.id).status).toBe("awaiting_payment");
    });

    it.each(["payment.created", "payment.updated", "order.updated", "order.fulfillment.updated"])(
      "a signed %s event triggers a payment check",
      async (type) => {
        const order = await awaitingPayment();
        customerPays(order.id);
        const response = await deliverWebhook(app, type);
        expect(response.status).toBe(200);
        expect(world.db.data(order.id).status).toBe("paid");
      }
    );
  });

  describe("an order becomes paid only if Square says its order is complete", () => {
    it("a signed event while Square's order is still OPEN changes nothing", async () => {
      const order = await awaitingPayment();
      world.outbox.clear();

      const response = await deliverWebhook(app);

      expect(response.status).toBe(200);
      expect(world.square.orderLookupCalls()).toHaveLength(1); // it asked Square, it did not assume
      expect(world.db.data(order.id).status).toBe("awaiting_payment");
      expect(world.db.data(order.id)).not.toHaveProperty("paidAt");
      expect(world.outbox.attempts).toHaveLength(0);
    });

    it("a CANCELED Square order does not count as paid", async () => {
      const order = await awaitingPayment();
      world.square.cancelLinkOrder(world.db.data(order.id).paymentLinkId as string);
      await deliverWebhook(app);
      expect(world.db.data(order.id).status).toBe("awaiting_payment");
    });

    it("a Square outage is not treated as paid; the next event after recovery is", async () => {
      const order = await awaitingPayment();
      customerPays(order.id);
      world.square.failOrderLookups = true;
      expect((await deliverWebhook(app)).status).toBe(200);
      expect(world.db.data(order.id).status).toBe("awaiting_payment");
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(0);

      world.square.failOrderLookups = false;
      await deliverWebhook(app);
      expect(world.db.data(order.id).status).toBe("paid");
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
    });

    it("when Square completes one customer's order, only that order is paid", async () => {
      const a = await awaitingPayment({ email: "a@customer.test" });
      const b = await awaitingPayment({ email: "b@customer.test" });
      customerPays(a.id);

      await deliverWebhook(app);

      expect(world.db.data(a.id).status).toBe("paid");
      expect(world.db.data(b.id).status).toBe("awaiting_payment");
      expect(receiptsTo("a@customer.test")).toHaveLength(1);
      expect(receiptsTo("b@customer.test")).toHaveLength(0);
    });

    it("only merch orders are considered (a lead row with the same fields is ignored)", async () => {
      const leadId = world.db.seed("lead", {
        email: "lead@customer.test",
        status: "awaiting_payment",
        paymentLinkId: "LINK_FAKE_99",
      });
      await deliverWebhook(app);
      expect(world.db.data(leadId).status).toBe("awaiting_payment");
      expect(world.square.apiCalls()).toHaveLength(0);
    });
  });

  describe("the paid transition and the receipt", () => {
    it("marks the order paid with a timestamp and sends the customer one receipt", async () => {
      const order = await awaitingPayment();
      world.outbox.clear();
      customerPays(order.id);
      advanceClock(3 * 60 * 60 * 1000);

      const response = await deliverWebhook(app);

      expect(response.status).toBe(200);
      expect(await jsonOf(response)).toEqual({ received: true });
      const data = world.db.data(order.id);
      expect(data.status).toBe("paid");
      expect(data.paidAt).toBe("2026-10-05T17:00:00.000Z");
      expect(data.paidEmailSentAt).toBe("2026-10-05T17:00:00.000Z");
      expect(data, "Square payments are not 'manual'").not.toHaveProperty("paidManually");

      const receipts = receiptsTo(CUSTOMER.email);
      expect(receipts).toHaveLength(1);
      expect(receipts[0].subject).toBe(`Payment received — ${order.orderRef}`);
      expect(receipts[0].html).toContain("Amount Paid");
      expect(receipts[0].html).toContain("$2450.50");
      customerSafe(receipts[0], backendValuesOf(data));
      expect(world.outbox.toBusiness, "the business is not emailed a receipt").toHaveLength(0);
    });

    it("duplicate deliveries one after another send exactly one receipt", async () => {
      const order = await awaitingPayment();
      customerPays(order.id);
      for (let i = 0; i < 4; i++) await deliverWebhook(app);

      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
      expect(world.square.orderLookupCalls(), "paid orders are not re-checked").toHaveLength(1);
      expect(world.db.data(order.id).status).toBe("paid");
    });

    it("concurrent deliveries send exactly one receipt", async () => {
      const order = await awaitingPayment();
      customerPays(order.id);

      const responses = await Promise.all(Array.from({ length: 8 }, () => deliverWebhook(app)));

      expect(responses.map((r) => r.status)).toEqual(Array(8).fill(200));
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
      expect(world.db.data(order.id).status).toBe("paid");
      expect(world.db.data(order.id)).toHaveProperty("paidEmailSentAt");
    });

    it("a webhook racing the dashboard's own payment sync still sends exactly one receipt", async () => {
      const order = await awaitingPayment();
      customerPays(order.id);
      const rows = [{ id: order.id, type: "merch_order", data: world.db.data(order.id) }];

      await Promise.all([
        app.webhook(webhookRequest()),
        app.merchPayments.syncAwaitingMerchPayments(rows),
        app.merchPayments.syncAwaitingMerchPayments(rows.map((r) => ({ ...r }))),
      ]);

      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
      expect(world.db.data(order.id).status).toBe("paid");
    });

    it("a database outage during the lookup returns 500 so Square retries, and recovery works", async () => {
      const order = await awaitingPayment();
      customerPays(order.id);
      world.db.failNext(
        /^SELECT id, type, data FROM submissions WHERE type = 'merch_order' AND data->>'status' = 'awaiting_payment'/
      );

      expect((await deliverWebhook(app)).status).toBe(500);
      expect(world.db.data(order.id).status).toBe("awaiting_payment");

      expect((await deliverWebhook(app)).status).toBe(200);
      expect(world.db.data(order.id).status).toBe("paid");
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
    });
  });

  describe("receipt retry sweep", () => {
    const isReceipt = (e: CapturedEmail) => /^Payment received/.test(e.subject);

    async function paidWithFailedReceipt() {
      const order = await awaitingPayment();
      customerPays(order.id);
      // One delivery tries the receipt three times (the paid transition, the retry inside the
      // sync, then the unreceipted-orders sweep), so a genuine provider outage is three rejections.
      world.outbox.rejectNext({ when: isReceipt, times: 3 });
      await deliverWebhook(app);
      // Precondition: paid, receipt attempted and rejected, claim released.
      expect(world.db.data(order.id).status).toBe("paid");
      expect(world.outbox.attempts.filter(isReceipt)).toHaveLength(3);
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(0);
      expect(world.db.data(order.id)).not.toHaveProperty("paidEmailSentAt");
      return order;
    }

    it("a single transient failure is retried within the same delivery", async () => {
      const order = await awaitingPayment();
      customerPays(order.id);
      world.outbox.rejectNext({ when: isReceipt }); // just one rejection
      await deliverWebhook(app);
      expect(world.outbox.attempts.filter(isReceipt)).toHaveLength(2); // rejected, then delivered
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
      expect(world.db.data(order.id)).toHaveProperty("paidEmailSentAt");
    });

    it("a receipt that failed is sent by the next webhook, once, and never again", async () => {
      const order = await paidWithFailedReceipt();

      await deliverWebhook(app);
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
      expect(world.db.data(order.id)).toHaveProperty("paidEmailSentAt");

      await deliverWebhook(app);
      await deliverWebhook(app);
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
    });

    it("concurrent sweeps send the failed receipt exactly once", async () => {
      await paidWithFailedReceipt();
      await Promise.all(Array.from({ length: 6 }, () => deliverWebhook(app)));
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
    });

    it("the retried receipt carries the right amount and no backend data", async () => {
      const order = await paidWithFailedReceipt();
      await deliverWebhook(app);
      const [receipt] = receiptsTo(CUSTOMER.email);
      expect(receipt.html).toContain("$2450.50");
      customerSafe(receipt, backendValuesOf(world.db.data(order.id)));
    });

    it("is still retried 13 days after payment", async () => {
      await paidWithFailedReceipt();
      advanceClock(13 * DAY_MS);
      await deliverWebhook(app);
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
    });

    it("is NOT retried after the 14-day window", async () => {
      const order = await paidWithFailedReceipt();
      advanceClock(15 * DAY_MS);
      await deliverWebhook(app);
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(0);
      expect(world.db.data(order.id)).not.toHaveProperty("paidEmailSentAt");
    });

    it("is not retried once the order was cancelled", async () => {
      const order = await paidWithFailedReceipt();
      app.signInAsAdmin();
      expect(await app.actions.updateMerchOrderStatus(order.id, "cancelled")).toEqual({ ok: true });
      await deliverWebhook(app);
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(0);
    });

    describe("the dashboard's own sync (rows already loaded by the admin page)", () => {
      const row = (id: number) => ({ id, type: "merch_order", data: world.db.data(id) });

      it("retries a recent unreceipted order but never one paid more than 14 days ago", async () => {
        const recent = seedOrder({
          status: "paid",
          paidAt: new Date(Date.parse(START_TIME) - 13 * DAY_MS).toISOString(),
        });
        const stale = seedOrder({
          status: "paid",
          email: "old@customer.test",
          paidAt: new Date(Date.parse(START_TIME) - 15 * DAY_MS).toISOString(),
        });

        const rows = [row(recent), row(stale)];
        await app.merchPayments.syncAwaitingMerchPayments(rows);

        expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
        expect(receiptsTo("old@customer.test")).toHaveLength(0);
        expect(rows[0].data).toHaveProperty("paidEmailSentAt"); // caller renders the fresh state
        expect(world.db.data(stale)).not.toHaveProperty("paidEmailSentAt");
      });

      it("skips cancelled orders", async () => {
        const id = seedOrder({ status: "cancelled", paidAt: START_TIME });
        await app.merchPayments.syncAwaitingMerchPayments([row(id)]);
        expect(world.outbox.attempts).toHaveLength(0);
      });

      it("a stale snapshot cannot overwrite a status changed after it was read", async () => {
        const order = await awaitingPayment();
        const snapshot = [row(order.id)]; // loaded while awaiting_payment
        app.signInAsAdmin();
        customerPays(order.id); // the customer's payment lands at Square...
        await app.actions.updateMerchOrderStatus(order.id, "cancelled"); // ...as the admin cancels

        await app.merchPayments.syncAwaitingMerchPayments(snapshot);

        expect(world.db.data(order.id).status).toBe("cancelled");
        expect(world.db.data(order.id)).not.toHaveProperty("paidAt");
      });
    });

    it("a stale snapshot of a since-cancelled order gets no 'Payment received' email", async () => {
      const order = await awaitingPayment();
      const snapshot = [{ id: order.id, type: "merch_order", data: world.db.data(order.id) }];
      app.signInAsAdmin();
      customerPays(order.id); // the customer's payment lands at Square...
      await app.actions.updateMerchOrderStatus(order.id, "cancelled"); // ...as the admin cancels

      await app.merchPayments.syncAwaitingMerchPayments(snapshot);

      // The guarded UPDATE matched zero rows (the order is cancelled), yet the in-memory row is
      // patched to "paid" anyway and the retry step then claims and sends a receipt. Expected:
      // a receipt only ever goes out for an order whose stored record shows it as paid.
      // Fix: in syncAwaitingMerchPayments, only patch row.data (and fall through to the receipt
      // retry) when the UPDATE returned a row; otherwise re-read the row.
      const sent = receiptsTo(CUSTOMER.email).length > 0;
      const recordedPaid = typeof world.db.data(order.id).paidAt === "string";
      expect(
        sent && !recordedPaid,
        "receipt sent for an order the database does not show as paid"
      ).toBe(false);
    });

    it("never emails customers of old orders that were paid before receipts existed", async () => {
      const old = seedOrder({
        status: "paid",
        paidAt: new Date(Date.parse(START_TIME) - 30 * DAY_MS).toISOString(),
      });
      const recentAndReceipted = seedOrder({
        status: "paid",
        paidAt: new Date(Date.parse(START_TIME) - DAY_MS).toISOString(),
        paidEmailSentAt: new Date(Date.parse(START_TIME) - DAY_MS).toISOString(),
      });
      await deliverWebhook(app);
      expect(world.outbox.attempts).toHaveLength(0);
      expect(world.db.data(old)).not.toHaveProperty("paidEmailSentAt");
      expect(world.db.data(recentAndReceipted).status).toBe("paid");
    });
  });
});

// ===========================================================================
// (4) ESP-order guards, manual payment and fulfillment
// ===========================================================================

describe("4. ESP-order guards, manual payment and fulfillment", () => {
  beforeEach(() => app.signInAsAdmin());

  describe("nothing is ordered from ESP before the customer has paid", () => {
    const unpaidStatuses = ["new", "reviewing", "quoted", "awaiting_payment", "cancelled"];
    const guarded = ["ordered_in_esp", "fulfilled"];

    it.each(unpaidStatuses.flatMap((from) => guarded.map((to) => [from, to])))(
      "status %s cannot move to %s without payment",
      async (from, to) => {
        const id = seedOrder({ status: from });
        const result = await app.actions.updateMerchOrderStatus(id, to);
        expect(result).toMatchObject({
          ok: false,
          error: expect.stringContaining("Payment hasn't been received"),
        });
        expect(world.db.data(id).status).toBe(from);
      }
    );

    it.each(["new", "awaiting_payment"])(
      "recording an ESP order number on a %s order is refused",
      async (status) => {
        const id = seedOrder({ status });
        const result = await app.actions.recordEspOrder(id, "PO-1");
        expect(result).toMatchObject({
          ok: false,
          error: expect.stringContaining("Payment hasn't been received"),
        });
        expect(world.db.data(id)).not.toHaveProperty("espOrderNumber");
        expect(world.db.data(id).status).toBe(status);
      }
    );

    it.each(["new", "awaiting_payment"])(
      "marking a %s order shipped is refused and emails nobody",
      async (status) => {
        const id = seedOrder({ status });
        const result = await app.actions.markMerchShipped(id, {
          carrier: "UPS",
          trackingNumber: "1Z999AA10123456784",
        });
        expect(result).toMatchObject({
          ok: false,
          error: expect.stringContaining("Payment hasn't been received"),
        });
        expect(world.db.data(id).status).toBe(status);
        expect(world.outbox.attempts).toHaveLength(0);
      }
    );

    it("an order paid through Square is unlocked", async () => {
      const order = await paidThroughSquare();
      expect(await app.actions.updateMerchOrderStatus(order.id, "ordered_in_esp")).toEqual({
        ok: true,
      });
      expect(world.db.data(order.id).status).toBe("ordered_in_esp");
    });

    it("rejects unknown statuses and unknown orders", async () => {
      const id = seedOrder();
      expect(await app.actions.updateMerchOrderStatus(id, "shipped-ish")).toEqual({
        ok: false,
        error: "Unknown status.",
      });
      expect(await app.actions.updateMerchOrderStatus(404, "reviewing")).toEqual({
        ok: false,
        error: "Order not found.",
      });
    });
  });

  describe("manual 'Paid' (check or bank transfer)", () => {
    it("stamps paidManually and paidAt and sends the customer a receipt once", async () => {
      const order = await placeOrder(app);
      world.outbox.clear();

      expect(await app.actions.updateMerchOrderStatus(order.id, "paid")).toEqual({ ok: true });

      expect(world.db.data(order.id)).toMatchObject({
        status: "paid",
        paidManually: true,
        paidAt: START_TIME,
        paidEmailSentAt: START_TIME,
      });
      const receipts = receiptsTo(CUSTOMER.email);
      expect(receipts).toHaveLength(1);
      expect(receipts[0].subject).toBe(`Payment received — ${order.orderRef}`);
      expect(receipts[0].html, "no quote on file, so no amount is claimed").not.toContain(
        "Amount Paid"
      );
      customerSafe(receipts[0], backendValuesOf(world.db.data(order.id)));
    });

    it("clicking Paid again does not send a second receipt or change the stamps", async () => {
      const order = await placeOrder(app);
      await app.actions.updateMerchOrderStatus(order.id, "paid");
      const first = world.db.data(order.id);
      advanceClock(60 * 60 * 1000);

      expect(await app.actions.updateMerchOrderStatus(order.id, "paid")).toEqual({ ok: true });

      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
      expect(world.db.data(order.id).paidAt).toBe(first.paidAt);
      expect(world.db.data(order.id).paidManually).toBe(true);
    });

    it("two simultaneous Paid clicks send exactly one receipt", async () => {
      const order = await placeOrder(app);
      const results = await Promise.all([
        app.actions.updateMerchOrderStatus(order.id, "paid"),
        app.actions.updateMerchOrderStatus(order.id, "paid"),
      ]);
      expect(results).toEqual([{ ok: true }, { ok: true }]);
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
      expect(world.db.data(order.id).status).toBe("paid");
    });

    it("a failed manual-paid receipt is picked up by the next payment sync, once", async () => {
      const order = await placeOrder(app);
      world.outbox.rejectNext({ when: (e) => /^Payment received/.test(e.subject) });
      expect(await app.actions.updateMerchOrderStatus(order.id, "paid")).toEqual({ ok: true });
      expect(world.db.data(order.id).status).toBe("paid"); // the failure never blocks the status change
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(0);

      await deliverWebhook(app);
      await deliverWebhook(app);
      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
    });

    it("if the customer then also pays the Square link, there is still just one receipt", async () => {
      const order = await placeOrder(app);
      await quoteOrder(app, order.id);
      await app.actions.updateMerchOrderStatus(order.id, "paid"); // paid by check
      customerPays(order.id);

      await deliverWebhook(app);

      expect(receiptsTo(CUSTOMER.email)).toHaveLength(1);
      expect(world.db.data(order.id).paidManually).toBe(true);
    });

    it("unlocks ESP ordering", async () => {
      const order = await placeOrder(app);
      await app.actions.updateMerchOrderStatus(order.id, "paid");
      expect(await app.actions.recordEspOrder(order.id, "PO-9")).toEqual({ ok: true });
    });
  });

  describe("fulfillment: ESP order number, then shipped", () => {
    it("records the ESP order number internally; the customer hears nothing", async () => {
      const order = await paidThroughSquare();
      const emailsBefore = world.outbox.attempts.length;
      advanceClock(2 * 60 * 60 * 1000);

      expect(await app.actions.recordEspOrder(order.id, "  PO-77/B  ")).toEqual({ ok: true });

      expect(world.db.data(order.id)).toMatchObject({
        status: "ordered_in_esp",
        espOrderNumber: "PO-77/B",
        espOrderedAt: "2026-10-05T16:00:00.000Z",
      });
      expect(world.outbox.attempts.length, "recording the ESP order sends no email").toBe(
        emailsBefore
      );
    });

    it.each([
      ["empty", ""],
      ["containing markup", "<script>alert(1)</script>"],
      ["longer than 40 characters", "P".repeat(41)],
    ])("rejects an ESP order number that is %s", async (_label, value) => {
      const order = await paidThroughSquare();
      const result = await app.actions.recordEspOrder(order.id, value);
      expect(result.ok).toBe(false);
      expect(world.db.data(order.id).status).toBe("paid");
      expect(world.db.data(order.id)).not.toHaveProperty("espOrderNumber");
    });

    it("correcting the number later keeps the original espOrderedAt", async () => {
      const order = await paidThroughSquare();
      await app.actions.recordEspOrder(order.id, "PO-1");
      const original = world.db.data(order.id).espOrderedAt;
      advanceClock(DAY_MS);
      app.signInAsAdmin(); // admin sessions last 24 hours
      await app.actions.recordEspOrder(order.id, "PO-2");
      expect(world.db.data(order.id)).toMatchObject({
        espOrderNumber: "PO-2",
        espOrderedAt: original,
      });
    });

    it("shipping stores carrier and tracking, fulfills the order, and emails tracking (never the ESP number)", async () => {
      const order = await paidThroughSquare();
      await app.actions.recordEspOrder(order.id, "PO-77/B");
      advanceClock(DAY_MS);
      app.signInAsAdmin(); // admin sessions last 24 hours

      const result = await app.actions.markMerchShipped(order.id, {
        carrier: " UPS ",
        trackingNumber: "1Z 999 AA1 0123456784",
      });

      expect(result).toEqual({ ok: true, emailed: true });
      expect(world.db.data(order.id)).toMatchObject({
        status: "fulfilled",
        carrier: "UPS",
        trackingNumber: "1Z999AA10123456784", // pasted spaces removed
        shippedAt: "2026-10-06T14:00:00.000Z",
        espOrderNumber: "PO-77/B", // kept internally
      });

      const [mail] = shippedTo(CUSTOMER.email);
      expect(shippedTo(CUSTOMER.email)).toHaveLength(1);
      expect(mail.subject).toBe(`Your order has shipped — ${order.orderRef}`);
      expect(mail.html).toContain("1Z999AA10123456784");
      expect(mail.html).toContain('href="https://www.ups.com/track?tracknum=1Z999AA10123456784"');
      for (const needle of [
        UMBRELLA_NAME.replace('"', "&quot;"),
        "Black",
        "Blue-Reflex",
        "Navy",
        "Iron",
      ]) {
        expect(mail.html, `shipment contents should list ${needle}`).toContain(needle);
      }
      expect(mail.html).not.toContain("PO-77/B");
      expect(mail.html, "unit prices are not shown on a shipping notice").not.toContain("14.79");
      customerSafe(mail, backendValuesOf(world.db.data(order.id)));
    });

    it("re-submitting corrects the tracking, re-sends the email and keeps the first shippedAt", async () => {
      const order = await paidThroughSquare();
      await app.actions.markMerchShipped(order.id, {
        carrier: "UPS",
        trackingNumber: "1Z999AA10123456784",
      });
      const shippedAt = world.db.data(order.id).shippedAt;
      advanceClock(2 * 60 * 60 * 1000);

      await app.actions.markMerchShipped(order.id, {
        carrier: "FedEx",
        trackingNumber: "123456789012",
      });

      expect(world.db.data(order.id)).toMatchObject({
        carrier: "FedEx",
        trackingNumber: "123456789012",
        shippedAt,
      });
      const mails = shippedTo(CUSTOMER.email);
      expect(mails).toHaveLength(2);
      expect(mails[1].html).toContain("https://www.fedex.com/fedextrack/?trknbr=123456789012");
    });

    it("an unrecognised carrier gets the number but no link, and the name is escaped", async () => {
      const order = await paidThroughSquare();
      await app.actions.markMerchShipped(order.id, {
        carrier: "Local Courier & Sons",
        trackingNumber: "LOCAL-12345",
      });
      const [mail] = shippedTo(CUSTOMER.email);
      expect(mail.html).toContain("Local Courier &amp; Sons");
      expect(mail.html).not.toContain("Local Courier & Sons");
      expect(mail.html).toContain("LOCAL-12345");
      expect(mail.html).not.toContain("Track Your Package");
    });

    it.each([
      ["a missing carrier", { carrier: "", trackingNumber: "1Z999AA10123456784" }],
      ["a missing tracking number", { carrier: "UPS", trackingNumber: "" }],
      ["a too-short tracking number", { carrier: "UPS", trackingNumber: "ab1" }],
      [
        "markup in the tracking number",
        { carrier: "UPS", trackingNumber: "<script>alert(1)</script>" },
      ],
    ])("rejects %s without saving or emailing", async (_label, input) => {
      const order = await paidThroughSquare();
      const emailsBefore = world.outbox.attempts.length;
      const result = await app.actions.markMerchShipped(order.id, input);
      expect(result.ok).toBe(false);
      expect(world.db.data(order.id).status).toBe("paid");
      expect(world.outbox.attempts.length).toBe(emailsBefore);
    });

    it("a failed shipped email still saves the shipment and reports emailed: false", async () => {
      const order = await paidThroughSquare();
      world.outbox.rejectNext({ when: (e) => /has shipped/.test(e.subject) });
      const result = await app.actions.markMerchShipped(order.id, {
        carrier: "USPS",
        trackingNumber: "9400111899223344556677",
      });
      expect(result).toEqual({ ok: true, emailed: false });
      expect(world.db.data(order.id).status).toBe("fulfilled");
    });

    it("recording the ESP number after shipping keeps the order Fulfilled", async () => {
      const order = await paidThroughSquare();
      await app.actions.markMerchShipped(order.id, {
        carrier: "UPS",
        trackingNumber: "1Z999AA10123456784",
      });
      expect(await app.actions.recordEspOrder(order.id, "PO-LATE")).toEqual({ ok: true });
      expect(world.db.data(order.id)).toMatchObject({
        status: "fulfilled",
        espOrderNumber: "PO-LATE",
      });
    });

    it("a cancelled order can be neither ordered from ESP nor shipped", async () => {
      const id = seedOrder({ status: "cancelled", paidAt: START_TIME });
      expect(await app.actions.recordEspOrder(id, "PO-1")).toEqual({
        ok: false,
        error: "This order was cancelled.",
      });
      expect(
        await app.actions.markMerchShipped(id, {
          carrier: "UPS",
          trackingNumber: "1Z999AA10123456784",
        })
      ).toEqual({ ok: false, error: "This order was cancelled." });
      expect(world.outbox.attempts).toHaveLength(0);
    });

    it("an order with no customer email cannot be shipped", async () => {
      const id = seedOrder({ status: "paid", paidAt: START_TIME, email: "" });
      expect(
        await app.actions.markMerchShipped(id, {
          carrier: "UPS",
          trackingNumber: "1Z999AA10123456784",
        })
      ).toEqual({ ok: false, error: "This order has no customer email." });
      expect(world.db.data(id).status).toBe("paid");
    });
  });
});

// ===========================================================================
// (5) Global invariants over complete lifecycles
// ===========================================================================

describe("5. global invariants across the whole lifecycle", () => {
  // Hostile input in every free-text field the customer controls.
  const HOSTILE = {
    firstName: 'Pat <script>alert(1)</script> "Q"',
    lastName: "O'Hara & Sons <img src=x onerror=alert(2)>\r\nBcc: attacker@evil.test",
    phone: "555-0100 <i>call</i>",
    notes: 'Line one <b>bold</b>\nLine "two" & <script>steal()</script>',
  };
  const RAW_FRAGMENTS = [
    "<script",
    "</script",
    "<img",
    "<b>",
    "<i>",
    "onerror=alert(2)>",
    '"Q"',
    "& Sons",
    '60" Arc',
  ];
  const ESCAPED_FIRST_NAME = "Pat &lt;script&gt;alert(1)&lt;/script&gt; &quot;Q&quot;";

  type Path = "square payment" | "manual payment" | "failed receipt then retry";

  async function runLifecycle(path: Path) {
    const order = await placeOrder(app, HOSTILE);
    const quote = await quoteOrder(app, order.id);

    if (path === "manual payment") {
      expect(await app.actions.updateMerchOrderStatus(order.id, "paid")).toEqual({ ok: true });
    } else {
      customerPays(order.id);
      if (path === "failed receipt then retry") {
        world.outbox.rejectNext({ when: (e) => /^Payment received/.test(e.subject), times: 3 });
        await deliverWebhook(app); // paid; receipt rejected on all three in-delivery attempts
      }
      await deliverWebhook(app); // pays (or retries the receipt)
      await deliverWebhook(app); // duplicate delivery
    }

    const espResult = await app.actions.recordEspOrder(order.id, "PO-77/B");
    expect(espResult).toEqual({ ok: true });
    const shipped = await app.actions.markMerchShipped(order.id, {
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
    });
    expect(shipped).toEqual({ ok: true, emailed: true });
    if (path === "square payment") {
      // A corrected tracking number sends a second shipped email.
      await app.actions.markMerchShipped(order.id, {
        carrier: "FedEx",
        trackingNumber: "123456789012",
      });
    }
    return { order, actionResults: [quote, espResult, shipped] };
  }

  const expectedCustomerSubjects: Record<Path, RegExp[]> = {
    "square payment": [
      /^We received your merchandise request/,
      /^Your Merchandise Quote Is Ready/,
      /^Payment received/,
      /^Your order has shipped/,
      /^Your order has shipped/,
    ],
    "manual payment": [
      /^We received your merchandise request/,
      /^Your Merchandise Quote Is Ready/,
      /^Payment received/,
      /^Your order has shipped/,
    ],
    "failed receipt then retry": [
      /^We received your merchandise request/,
      /^Your Merchandise Quote Is Ready/,
      /^Payment received/,
      /^Your order has shipped/,
    ],
  };

  describe.each<Path>(["square payment", "manual payment", "failed receipt then retry"])(
    "%s",
    (path) => {
      it("sends each customer exactly the expected emails, in order", async () => {
        await runLifecycle(path);
        const subjects = world.outbox.toCustomers.map((e) => e.subject);
        expectedCustomerSubjects[path].forEach((pattern, index) => {
          expect(subjects[index], `customer email #${index + 1} of ${subjects.length}`).toMatch(
            pattern
          );
        });
        expect(subjects).toHaveLength(expectedCustomerSubjects[path].length);
        expect(
          world.outbox.toBusiness,
          "the business gets only the order notification"
        ).toHaveLength(1);
      });

      it("no customer-addressed email, at any step, contains backend-only data", async () => {
        const { order, actionResults } = await runLifecycle(path);
        const stored = world.db.data(order.id);
        const backendValues = backendValuesOf(stored);

        // Sanity: the stored order really holds the backend data we are guarding...
        expect(backendValues).toEqual(
          expect.arrayContaining([
            "Prime Line",
            "SanMar",
            "asi/79530",
            "OD205",
            "NKDC1963",
            "PO-77/B",
          ])
        );
        // ...and the business email really contains it, so the oracle below can detect leaks.
        const businessHtml = world.outbox.toBusiness[0].html;
        expect(businessHtml).toMatch(/espplus/i);
        expect(businessHtml).toMatch(BACKEND_LEAK_PATTERN);

        expect(world.outbox.toCustomers.length).toBeGreaterThan(0);
        for (const email of world.outbox.toCustomers) customerSafe(email, backendValues);

        // Server-action return values are not a side channel either.
        for (const result of actionResults) {
          expect(JSON.stringify(result)).not.toMatch(BACKEND_LEAK_PATTERN);
        }
      });

      it("hostile input is HTML-escaped in every email, and no subject can carry a line break", async () => {
        await runLifecycle(path);
        expect(world.outbox.delivered.length).toBeGreaterThan(1);

        for (const email of world.outbox.delivered) {
          const label = `email "${email.subject}" to ${email.to}`;
          for (const fragment of RAW_FRAGMENTS) {
            expect(
              email.html.includes(fragment),
              `${label} contains unescaped ${JSON.stringify(fragment)}`
            ).toBe(false);
          }
          expect(email.subject, `${label}: subject has a line break`).not.toMatch(/[\r\n]/);
          expect(email.to).not.toMatch(/[\r\n]/);
          expect(email.replyTo ?? "").not.toMatch(/[\r\n]/);
          // Plain-text view check: stripping the template's own tags must leave no markup from the attacker.
          expect(htmlText(email.html)).not.toMatch(/alert\(\d\)>|steal\(\)<\/?/);
        }

        // Where the customer's name appears, it appears in its escaped form.
        for (const email of world.outbox.toCustomers) {
          expect(email.html, `greeting in "${email.subject}"`).toContain(
            `Hi ${ESCAPED_FIRST_NAME},`
          );
        }
        const business = world.outbox.toBusiness[0].html;
        expect(business).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
        expect(business).toContain("&amp; Sons &lt;img src=x onerror=alert(2)&gt;");
        expect(business).toContain("&lt;i&gt;call&lt;/i&gt;"); // phone
        expect(business).toContain(
          "Line one &lt;b&gt;bold&lt;/b&gt;<br/>Line &quot;two&quot; &amp; &lt;script&gt;steal()&lt;/script&gt;"
        );
        expect(business).toContain("60&quot; Arc Jumbo Golf Umbrella");
      });
    }
  );

  it("the stored order keeps the hostile text verbatim (escaping happens on output, not input)", async () => {
    const order = await placeOrder(app, HOSTILE);
    const stored = world.db.data(order.id);
    expect(stored.firstName).toBe(HOSTILE.firstName);
    expect(stored.notes).toBe(HOSTILE.notes);
  });
});

// ===========================================================================
// Adjacent email builders found to skip HTML escaping
// ===========================================================================

describe("other emails the merch/contact forms send", () => {
  const SCRIPT = "<script>alert(1)</script>";

  it("sendMerchOrderNotification (/api/merchant/order-request) escapes form fields in HTML", async () => {
    const result = await app.email.sendMerchOrderNotification({
      firstName: SCRIPT,
      lastName: "Lee",
      email: "pat@customer.test",
      phone: "5555551234",
      product: SCRIPT,
      quantity: "100",
      notes: SCRIPT,
    } as never);
    expect(result.sent).toBe(true);
    // Fix: wrap every interpolated value in escapeHtml() (and multiline() for notes), as
    // sendCartOrderNotification already does.
    expect(world.outbox.toBusiness[0].html).not.toContain("<script>");
  });

  it("sendLeadNotification escapes the contact form's fields in HTML", async () => {
    await app.email.sendLeadNotification({
      formType: "lead",
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@customer.test",
      phone: "5555551234",
      service: "Consulting",
      message: `Hello ${SCRIPT}`,
    } as never);
    expect(world.outbox.toBusiness[0].html).not.toContain("<script>");
  });

  it("sendLeadAutoResponder escapes the visitor's first name in HTML", async () => {
    await app.email.sendLeadAutoResponder({
      formType: "lead",
      firstName: SCRIPT,
      lastName: "Lee",
      email: "pat@customer.test",
      phone: "5555551234",
      service: "Consulting",
      message: "Hi",
    } as never);
    expect(world.outbox.toCustomers[0].html).not.toContain("<script>");
  });

  it("sendPaymentRequestNotification escapes the invoice memo in HTML", async () => {
    await app.email.sendPaymentRequestNotification({
      organizationName: "Acme",
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@customer.test",
      memo: SCRIPT,
      amount: 10,
    } as never);
    expect(world.outbox.toBusiness[0].html).not.toContain("<script>");
  });

  it("COPY: no customer email mentions a supplier, even generically", async () => {
    // The strict invariant has no allowance for the word "supplier": the confirmation, quote and
    // receipt copy say "we are placing your order" and name nobody.
    const order = await placeOrder(app);
    app.signInAsAdmin();
    await quoteOrder(app, order.id);
    customerPays(order.id);
    await deliverWebhook(app);
    expect(world.outbox.toCustomers.length).toBeGreaterThanOrEqual(3);
    for (const email of world.outbox.toCustomers) {
      expect(`${email.subject} ${email.html}`).not.toMatch(BACKEND_LEAK_PATTERN);
    }
  });
});
