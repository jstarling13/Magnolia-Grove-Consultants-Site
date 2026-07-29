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
          redirect_url: `${siteUrl}/thank-you?source=payment&email=${encodeURIComponent(params.buyerEmail)}`,
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
