/**
 * A fake of the outbound HTTP the app performs, installed with
 * `vi.stubGlobal("fetch", fake.fetch)`:
 *
 *   Square   POST /v2/online-checkout/payment-links   (create a payment link)
 *            GET  /v2/online-checkout/payment-links/{id}   (-> order_id)
 *            GET  /v2/orders/{order_id}                    (-> state)
 *   Turnstile POST https://challenges.cloudflare.com/turnstile/v0/siteverify
 *
 * Any other URL throws, so an unexpected network call (for example the app
 * reaching out somewhere new) fails the test loudly instead of passing quietly.
 * It also checks the request is authenticated the way Square requires.
 * Everything here uses fake credentials; nothing touches a real service.
 */

export const FAKE_SQUARE_ACCESS_TOKEN = "sq0atp-FAKE-test-token";
export const FAKE_SQUARE_LOCATION_ID = "LOCATION_FAKE_1";
export const FAKE_TURNSTILE_SECRET = "turnstile-FAKE-secret";
/** The only Turnstile token the fake siteverify endpoint treats as human. */
export const VALID_TURNSTILE_TOKEN = "valid-turnstile-token";

export interface FakePaymentLink {
  id: string;
  url: string;
  orderId: string;
  amountCents: number;
  currency: string;
  name: string;
  buyerEmail: string | undefined;
  redirectUrl: string | undefined;
  locationId: string | undefined;
}

export type SquareOrderState = "OPEN" | "COMPLETED" | "CANCELED";

export interface RecordedCall {
  method: string;
  url: string;
}

export class FakeSquare {
  readonly links = new Map<string, FakePaymentLink>();
  readonly orderStates = new Map<string, SquareOrderState>();
  readonly calls: RecordedCall[] = [];
  private seq = 0;
  private createFailures: number[] = [];
  /** When true, order lookups return HTTP 500 (a Square outage). */
  failOrderLookups = false;

  /** Make the next payment-link creation fail with this HTTP status. */
  failNextCreate(status = 500): void {
    this.createFailures.push(status);
  }

  /** Calls to Square itself (excludes Turnstile verification). */
  apiCalls(): RecordedCall[] {
    return this.calls.filter((c) => c.url.includes("squareup"));
  }

  linkCreateCalls(): RecordedCall[] {
    return this.calls.filter((c) => c.method === "POST" && c.url.includes("/payment-links"));
  }

  orderLookupCalls(): RecordedCall[] {
    return this.calls.filter((c) => c.method === "GET" && c.url.includes("/v2/orders/"));
  }

  /** The buyer pays: the order behind this payment link becomes COMPLETED. */
  payLink(linkId: string): void {
    const link = this.links.get(linkId);
    if (!link) throw new Error(`FakeSquare: no payment link ${linkId}`);
    this.orderStates.set(link.orderId, "COMPLETED");
  }

  cancelLinkOrder(linkId: string): void {
    const link = this.links.get(linkId);
    if (!link) throw new Error(`FakeSquare: no payment link ${linkId}`);
    this.orderStates.set(link.orderId, "CANCELED");
  }

  readonly fetch = async (input: unknown, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string" ? input : String((input as { url?: string }).url ?? input);
    const method = (init?.method ?? "GET").toUpperCase();
    this.calls.push({ method, url });

    if (url === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
      const body = init?.body;
      const params =
        body instanceof URLSearchParams ? body : new URLSearchParams(String(body ?? ""));
      const ok =
        params.get("secret") === FAKE_TURNSTILE_SECRET &&
        params.get("response") === VALID_TURNSTILE_TOKEN;
      return json({ success: ok });
    }

    const squareBase = /^https:\/\/connect\.squareup(?:sandbox)?\.com(\/.*)$/.exec(url);
    if (!squareBase) {
      throw new Error(`FakeSquare: unexpected outbound request ${method} ${url}`);
    }
    const path = squareBase[1];

    const headers = new Headers(init?.headers);
    if (headers.get("authorization") !== `Bearer ${FAKE_SQUARE_ACCESS_TOKEN}`) {
      return json({ errors: [{ code: "UNAUTHORIZED" }] }, 401);
    }
    if (!headers.get("square-version")) {
      throw new Error(`FakeSquare: ${method} ${path} sent without a Square-Version header`);
    }

    if (method === "POST" && path === "/v2/online-checkout/payment-links") {
      const forcedStatus = this.createFailures.shift();
      if (forcedStatus !== undefined) {
        return json({ errors: [{ code: "INTERNAL_SERVER_ERROR" }] }, forcedStatus);
      }
      const body = JSON.parse(String(init?.body)) as {
        idempotency_key?: string;
        quick_pay?: {
          name?: string;
          price_money?: { amount?: number; currency?: string };
          location_id?: string;
        };
        checkout_options?: { redirect_url?: string };
        pre_populated_data?: { buyer_email?: string };
      };
      if (!body.idempotency_key) throw new Error("FakeSquare: create link without idempotency_key");
      const amount = body.quick_pay?.price_money?.amount;
      if (!Number.isInteger(amount) || (amount as number) <= 0) {
        return json({ errors: [{ code: "INVALID_VALUE", field: "price_money.amount" }] }, 400);
      }
      this.seq += 1;
      const link: FakePaymentLink = {
        id: `LINK_FAKE_${this.seq}`,
        url: `https://checkout.square.test/pay/LINK_FAKE_${this.seq}`,
        orderId: `ORDER_FAKE_${this.seq}`,
        amountCents: amount as number,
        currency: body.quick_pay?.price_money?.currency ?? "",
        name: body.quick_pay?.name ?? "",
        buyerEmail: body.pre_populated_data?.buyer_email,
        redirectUrl: body.checkout_options?.redirect_url,
        locationId: body.quick_pay?.location_id,
      };
      this.links.set(link.id, link);
      this.orderStates.set(link.orderId, "OPEN");
      return json({ payment_link: { id: link.id, url: link.url, order_id: link.orderId } });
    }

    let m: RegExpExecArray | null;
    if (method === "GET" && (m = /^\/v2\/online-checkout\/payment-links\/([^/?]+)$/.exec(path))) {
      const link = this.links.get(decodeURIComponent(m[1]));
      if (!link) return json({ errors: [{ code: "NOT_FOUND" }] }, 404);
      return json({ payment_link: { id: link.id, order_id: link.orderId } });
    }

    if (method === "GET" && (m = /^\/v2\/orders\/([^/?]+)$/.exec(path))) {
      if (this.failOrderLookups) return json({ errors: [{ code: "INTERNAL_SERVER_ERROR" }] }, 500);
      const state = this.orderStates.get(decodeURIComponent(m[1]));
      if (!state) return json({ errors: [{ code: "NOT_FOUND" }] }, 404);
      return json({ order: { id: m[1], state } });
    }

    throw new Error(`FakeSquare: unsupported Square request ${method} ${path}`);
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Minimal sliding limiter standing in for the Upstash-backed one (5 per key). */
export class FakeRateLimiter {
  private counts = new Map<string, number>();
  constructor(private readonly limit = 5) {}

  readonly check = async (identifier: string) => {
    const used = (this.counts.get(identifier) ?? 0) + 1;
    this.counts.set(identifier, used);
    return {
      success: used <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - used),
    };
  };

  reset(): void {
    this.counts.clear();
  }
}
