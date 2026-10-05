/**
 * Shared wiring for the end-to-end order lifecycle tests.
 *
 * The test file registers `vi.mock` for the few modules that touch the outside
 * world (database, Resend, rate limiter, next/headers, next/cache) and points
 * each at the matching member of `world`. Everything else is the real
 * application code: the cart-checkout route, pricing, ESP link stamping, email
 * builders, Square client, webhook route, payment sync and admin actions.
 *
 * Square, Turnstile and admin-session handling are exercised for real too: the
 * HTTP they make goes to `world.square` (a fake fetch), and admin sessions are
 * real signed tokens created with `createSessionToken`.
 */
import { createHmac } from "node:crypto";
import { vi } from "vitest";
import { NextRequest } from "next/server";
import { FakeSubmissionsDb } from "./fakeSubmissionsDb";
import { EmailOutbox } from "./emailOutbox";
import {
  FAKE_SQUARE_ACCESS_TOKEN,
  FAKE_SQUARE_LOCATION_ID,
  FAKE_TURNSTILE_SECRET,
  FakeRateLimiter,
  FakeSquare,
  VALID_TURNSTILE_TOKEN,
} from "./fakeSquare";

// ---------------------------------------------------------------------------
// Constants (all fake)
// ---------------------------------------------------------------------------

/** The frozen "now" every test starts at. */
export const START_TIME = "2026-10-05T14:00:00.000Z";
export const BUSINESS_INBOX = "inbox@mg-test.invalid";
export const SITE_URL = "https://site.test";
export const WEBHOOK_SIGNATURE_KEY = "square-webhook-FAKE-signature-key";
export const WEBHOOK_NOTIFICATION_URL = "https://site.test/api/webhooks/square";
export const SIGNATURE_HEADER = "x-square-hmacsha256-signature";
export const ADMIN_COOKIE_NAME = "admin_session";
export const DAY_MS = 24 * 60 * 60 * 1000;

const BASE_ENV: Record<string, string> = {
  RESEND_API_KEY: "re_FAKE_test_key",
  CONTACT_EMAIL_FROM: "Magnolia Grove <orders@mg-test.invalid>",
  CONTACT_EMAIL_TO: BUSINESS_INBOX,
  SQUARE_ACCESS_TOKEN: FAKE_SQUARE_ACCESS_TOKEN,
  SQUARE_LOCATION_ID: FAKE_SQUARE_LOCATION_ID,
  SQUARE_ENVIRONMENT: "sandbox",
  SQUARE_WEBHOOK_SIGNATURE_KEY: WEBHOOK_SIGNATURE_KEY,
  SQUARE_WEBHOOK_NOTIFICATION_URL: WEBHOOK_NOTIFICATION_URL,
  TURNSTILE_SECRET_KEY: FAKE_TURNSTILE_SECRET,
  ADMIN_SESSION_SECRET: "admin-session-FAKE-secret",
  NEXT_PUBLIC_SITE_URL: SITE_URL,
};

/** Real catalog products. Colors and price tiers are read from the live catalog data. */
export const UMBRELLA_ID = "60-arc-jumbo-golf-umbrella-48490"; // Black / Blue-Reflex; min 24, 72+ => $14.79
export const POLO_ID = "nike-dri-fit-polo"; // 20 colors incl. Navy; $58.82 flat; direct ESP link + supplier data
export const VEST_ID = "peter-millar-galway-stretch-vest"; // Black/Iron/White/Navy; min 6 => $156.57; ESP search link
export const UMBRELLA_NAME = '60" Arc Jumbo Golf Umbrella';

export interface CartLine {
  productId: string;
  color?: string;
  quantity: number;
}

/**
 * The same umbrella in two colors (24 + 48 = 72 units, which together reach the
 * 72-unit tier), a polo, and a vest. Totals below were worked out by hand from
 * the catalog tiers, independently of the pricing code under test:
 *   umbrella 72 x 14.79 -> 24 x 14.79 = 354.96, 48 x 14.79 = 709.92
 *   polo      3 x 58.82 = 176.46
 *   vest      6 x 156.57 = 939.42
 */
export const DEFAULT_CART: CartLine[] = [
  { productId: UMBRELLA_ID, color: "Black", quantity: 24 },
  { productId: UMBRELLA_ID, color: "Blue-Reflex", quantity: 48 },
  { productId: POLO_ID, color: "Navy", quantity: 3 },
  { productId: VEST_ID, color: "Iron", quantity: 6 },
];
export const DEFAULT_CART_TOTAL = 2180.76;
export const DEFAULT_CART_UNITS = 81;

export const CUSTOMER = {
  firstName: "Pat",
  lastName: "Lee",
  email: "pat@customer.test",
  phone: "5555551234",
  notes: "",
};

/** The final price the admin quotes (decoration, shipping, tax on top of the estimate). */
export const DEFAULT_QUOTE = 2450.5;

// ---------------------------------------------------------------------------
// The shared "world" the vi.mock factories delegate to
// ---------------------------------------------------------------------------

export const world = {
  db: new FakeSubmissionsDb(),
  outbox: new EmailOutbox(BUSINESS_INBOX),
  square: new FakeSquare(),
  limiter: new FakeRateLimiter(5),
  /** Value of the admin session cookie the next request carries (undefined = signed out). */
  adminCookie: undefined as string | undefined,
};

export interface AppOptions {
  /** false = no RESEND_API_KEY / CONTACT_EMAIL_FROM. Default true. */
  resend?: boolean;
  /** false = no SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID. Default true. */
  square?: boolean;
  /** false = no Turnstile secret (verification skipped). Default true. */
  turnstile?: boolean;
  /** false = no webhook signature key / notification URL. Default true. */
  webhookEnv?: boolean;
}

/** Fresh world, frozen clock. Call from beforeEach. */
export function beginTest(): void {
  world.db = new FakeSubmissionsDb();
  world.outbox = new EmailOutbox(BUSINESS_INBOX);
  world.square = new FakeSquare();
  world.limiter = new FakeRateLimiter(5);
  world.adminCookie = undefined;
  // Only Date is faked: promises and microtasks stay real so concurrency tests are honest.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(START_TIME));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
}

/** Call from afterEach. */
export function endTest(): void {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
}

export function advanceClock(ms: number): void {
  vi.setSystemTime(Date.now() + ms);
}

/**
 * Applies the fake environment, then imports the real application modules from
 * a clean module registry. email.ts, square.ts and turnstile.ts read their
 * configuration when first imported, so "Square not configured" and friends are
 * modelled by loading the app again with different options.
 */
export async function loadApp(options: AppOptions = {}) {
  const { resend = true, square = true, turnstile = true, webhookEnv = true } = options;
  vi.resetModules();

  const unset = new Set<string>();
  if (!resend) ["RESEND_API_KEY", "CONTACT_EMAIL_FROM"].forEach((k) => unset.add(k));
  if (!square) ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID"].forEach((k) => unset.add(k));
  if (!turnstile) unset.add("TURNSTILE_SECRET_KEY");
  if (!webhookEnv) {
    ["SQUARE_WEBHOOK_SIGNATURE_KEY", "SQUARE_WEBHOOK_NOTIFICATION_URL"].forEach((k) =>
      unset.add(k)
    );
  }
  for (const [key, value] of Object.entries(BASE_ENV)) {
    vi.stubEnv(key, unset.has(key) ? undefined : value);
  }
  vi.stubEnv("NODE_ENV", "test");
  vi.stubGlobal("fetch", world.square.fetch);

  const [checkoutRoute, webhookRoute, actions, merchPayments, adminAuth, orders, email] =
    await Promise.all([
      import("@/app/api/merchant/cart-checkout/route"),
      import("@/app/api/webhooks/square/route"),
      import("@/app/admin/actions"),
      import("@/lib/merchPayments"),
      import("@/lib/adminAuth"),
      import("@/lib/merchOrders"),
      import("@/lib/email"),
    ]);

  return {
    checkout: checkoutRoute.POST,
    webhook: webhookRoute.POST,
    actions,
    merchPayments,
    orders,
    email,
    /** Real signed admin session token (what the login flow would set as a cookie). */
    createAdminToken: (username = "ben") => adminAuth.createSessionToken(username),
    signInAsAdmin(username = "ben") {
      world.adminCookie = adminAuth.createSessionToken(username);
    },
    signOut() {
      world.adminCookie = undefined;
    },
  };
}

export type App = Awaited<ReturnType<typeof loadApp>>;

// ---------------------------------------------------------------------------
// Request builders
// ---------------------------------------------------------------------------

export function cartRequest(
  body: Record<string, unknown>,
  options: { ip?: string } = {}
): NextRequest {
  return new NextRequest("http://localhost/api/merchant/cart-checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": options.ip ?? "203.0.113.7",
    },
    body: JSON.stringify(body),
  });
}

/** A complete valid checkout payload; override any field. */
export function cartBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...CUSTOMER,
    items: DEFAULT_CART,
    turnstileToken: VALID_TURNSTILE_TOKEN,
    ...overrides,
  };
}

/** Square's documented signature: base64(HMAC-SHA256(key, notificationUrl + rawBody)). */
export function squareSignature(
  rawBody: string,
  key = WEBHOOK_SIGNATURE_KEY,
  notificationUrl = WEBHOOK_NOTIFICATION_URL
): string {
  return createHmac("sha256", key)
    .update(notificationUrl + rawBody)
    .digest("base64");
}

export function squareEventBody(type = "payment.updated", id = "evt-1"): string {
  return JSON.stringify({
    merchant_id: "MERCHANT_FAKE",
    type,
    event_id: id,
    created_at: new Date().toISOString(),
    data: { type: "payment", id: "PAYMENT_FAKE", object: { payment: { status: "COMPLETED" } } },
  });
}

/** A webhook request signed the way Square signs it (override pieces to forge one). */
export function webhookRequest(
  options: {
    body?: string;
    signature?: string | null;
    key?: string;
    notificationUrl?: string;
  } = {}
): NextRequest {
  const body = options.body ?? squareEventBody();
  const headers: Record<string, string> = { "content-type": "application/json" };
  const signature =
    options.signature === undefined
      ? squareSignature(body, options.key, options.notificationUrl)
      : options.signature;
  if (signature !== null) headers[SIGNATURE_HEADER] = signature;
  return new NextRequest(WEBHOOK_NOTIFICATION_URL, { method: "POST", headers, body });
}

// ---------------------------------------------------------------------------
// Lifecycle shortcuts
// ---------------------------------------------------------------------------

export interface PlacedOrder {
  id: number;
  orderRef: string;
}

/** Customer submits a cart through the real route. Fails the test if it does not succeed. */
export async function placeOrder(
  app: App,
  overrides: Record<string, unknown> = {},
  options: { ip?: string } = {}
): Promise<PlacedOrder> {
  const response = await app.checkout(cartRequest(cartBody(overrides), options));
  const json = (await response.json()) as { success?: boolean; orderRef?: string; error?: string };
  if (response.status !== 200 || !json.success || !json.orderRef) {
    throw new Error(
      `placeOrder: expected a saved order, got HTTP ${response.status} ${JSON.stringify(json)}`
    );
  }
  return { orderRef: json.orderRef, id: Number(json.orderRef.replace(/^MG-0*/, "")) };
}

/** Admin quotes the order and sends the Square link. Fails the test if it does not succeed. */
export async function quoteOrder(app: App, id: number, total = DEFAULT_QUOTE) {
  app.signInAsAdmin();
  const result = await app.actions.sendMerchPaymentLink(id, total);
  if (!result.ok) throw new Error(`quoteOrder: ${result.error}`);
  return result;
}

/** The customer pays the Square link stored on the order. */
export function customerPays(id: number): void {
  const linkId = world.db.data(id).paymentLinkId;
  if (typeof linkId !== "string" || !linkId) throw new Error(`order ${id} has no payment link`);
  world.square.payLink(linkId);
}

export async function deliverWebhook(app: App, type = "payment.updated") {
  return app.webhook(webhookRequest({ body: squareEventBody(type) }));
}

// ---------------------------------------------------------------------------
// Leak / escaping oracles
// ---------------------------------------------------------------------------

/** Tokens that must never appear in anything a customer can read. */
export const BACKEND_LEAK_PATTERN = /espplus|supplier|asi\/|productNo|espOrderNumber|espId/i;

/**
 * The customer-facing copy deliberately says "we place your order with our
 * supplier". That generic phrase names nobody and reveals no link, supplier
 * identity, ASI number, product number or order number, so the leak check
 * allows exactly that phrase and nothing else containing "supplier".
 */
export function withoutGenericSupplierCopy(html: string): string {
  return html.replace(/our supplier/gi, "our [generic-copy]");
}

/** Every backend-only value stamped on a stored order's lines (and the ESP order number). */
export function backendValuesOf(data: Record<string, unknown>): string[] {
  const values = new Set<string>();
  const items = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : [];
  for (const item of items) {
    for (const key of ["espUrl", "supplier", "asi", "productNo"]) {
      const value = item[key];
      if (typeof value === "string" && value) values.add(value);
    }
  }
  if (typeof data.espOrderNumber === "string" && data.espOrderNumber) {
    values.add(data.espOrderNumber);
  }
  return [...values];
}
