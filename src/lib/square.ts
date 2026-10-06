/**
 * Square Checkout (Payment Links) integration for client invoice payments.
 * Uses Square's hosted Quick Pay checkout — no card data ever touches our
 * server, and no client-side SDK/script is required.
 */

const hasSquareConfig =
  Boolean(process.env.SQUARE_ACCESS_TOKEN) && Boolean(process.env.SQUARE_LOCATION_ID);

const SQUARE_API_BASE =
  process.env.SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

const SQUARE_API_VERSION = "2024-10-17";

export interface CreatePaymentLinkParams {
  organizationName: string;
  memo: string;
  amountCents: number;
  buyerEmail: string;
  /** Selects the thank-you page copy shown after payment. Defaults to "payment" (invoices). */
  redirectSource?: "payment" | "merch";
}

export interface SquareCheckoutResult {
  url: string | null;
  id?: string;
  error?: "not_configured" | "square_api_error";
}

export async function createPaymentLink(
  params: CreatePaymentLinkParams
): Promise<SquareCheckoutResult> {
  if (!hasSquareConfig) {
    console.warn(
      "[square] SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID not set — payments are not configured."
    );
    return { url: null, error: "not_configured" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://magnoliagrovega.com";

  try {
    const response = await fetch(`${SQUARE_API_BASE}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        "Square-Version": SQUARE_API_VERSION,
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        quick_pay: {
          name: `${params.organizationName} — ${params.memo}`.slice(0, 255),
          price_money: { amount: params.amountCents, currency: "USD" },
          location_id: process.env.SQUARE_LOCATION_ID,
        },
        checkout_options: {
          // No customer data in the URL: it lands in browser history, server logs and
          // referrers. The email is already pre-populated on Square's own page.
          redirect_url: `${siteUrl}/thank-you?source=${params.redirectSource ?? "payment"}`,
        },
        pre_populated_data: {
          buyer_email: params.buyerEmail,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[square] payment link creation failed:", response.status, errorBody);
      return { url: null, error: "square_api_error" };
    }

    const data = (await response.json()) as { payment_link?: { id?: string; url?: string } };
    return { url: data.payment_link?.url ?? null, id: data.payment_link?.id };
  } catch (error) {
    console.error("[square] payment link request failed:", error);
    return { url: null, error: "square_api_error" };
  }
}

export type PaymentStatus = "paid" | "pending" | "unknown";

/**
 * Resolves a payment link to its order's current state. Two API calls
 * because Square's payment link only carries the order_id — the actual
 * completion state lives on the order itself.
 */
export async function getPaymentLinkStatus(paymentLinkId: string): Promise<PaymentStatus> {
  if (!hasSquareConfig) return "unknown";

  try {
    const linkResponse = await fetch(
      `${SQUARE_API_BASE}/v2/online-checkout/payment-links/${paymentLinkId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
          "Square-Version": SQUARE_API_VERSION,
        },
      }
    );
    if (!linkResponse.ok) return "unknown";

    const linkData = (await linkResponse.json()) as { payment_link?: { order_id?: string } };
    const orderId = linkData.payment_link?.order_id;
    if (!orderId) return "unknown";

    const orderResponse = await fetch(`${SQUARE_API_BASE}/v2/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        "Square-Version": SQUARE_API_VERSION,
      },
    });
    if (!orderResponse.ok) return "unknown";

    const orderData = (await orderResponse.json()) as { order?: { state?: string } };
    return orderData.order?.state === "COMPLETED" ? "paid" : "pending";
  } catch (error) {
    console.error("[square] payment link status lookup failed:", error);
    return "unknown";
  }
}

export type DeletePaymentLinkResult =
  { ok: true } | { ok: false; error: "not_configured" | "square_api_error" };

/**
 * Deletes a payment link at Square so it can no longer be paid. Used when an
 * order is re-quoted (the old emailed link must die) or cancelled. A link Square
 * no longer knows about (404) counts as success: the goal state, "this link
 * cannot be paid", already holds.
 */
export async function deletePaymentLink(paymentLinkId: string): Promise<DeletePaymentLinkResult> {
  if (!hasSquareConfig) return { ok: false, error: "not_configured" };
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(paymentLinkId))
    return { ok: false, error: "square_api_error" };

  try {
    const response = await fetch(
      `${SQUARE_API_BASE}/v2/online-checkout/payment-links/${encodeURIComponent(paymentLinkId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
          "Square-Version": SQUARE_API_VERSION,
        },
      }
    );
    if (response.ok || response.status === 404) return { ok: true };
    console.error("[square] payment link deletion failed:", response.status, await response.text());
    return { ok: false, error: "square_api_error" };
  } catch (error) {
    console.error("[square] payment link deletion request failed:", error);
    return { ok: false, error: "square_api_error" };
  }
}
