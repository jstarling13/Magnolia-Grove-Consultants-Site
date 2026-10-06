import { NextRequest, NextResponse } from "next/server";
import {
  cartCheckoutSchema,
  formatOrderReference,
  type PricedCartLineItem,
} from "@/lib/merchOrders";
import { getProductById } from "@/config/merchandiseConfig";
import { CART_FORM_LIMITS, cleanLineDetail } from "@/lib/cartFormRules";
import { cartSendFailureMessage } from "@/lib/cartShopperMessages";
import { cleanLineColor, validateCart, type CartPricingProduct } from "@/lib/cartPricing";
import { checkRateLimit } from "@/lib/ratelimit";
import { CART_POLICY, EMAIL_TARGET_POLICY } from "@/lib/rateLimitPolicies";
import { emailKey, getClientIp, readJsonBody, tooManyRequests } from "@/lib/http";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendCartOrderNotification, sendMerchRequestConfirmation } from "@/lib/email";
import { recordSubmission } from "@/lib/submissions";
import { getEspLink } from "@/lib/espLinks";

export const runtime = "nodejs";

const MAX_CART_LINES = CART_FORM_LIMITS.maxLines;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rateLimitResult = await checkRateLimit(`cart:${ip}`, CART_POLICY);
  if (!rateLimitResult.success)
    return tooManyRequests(undefined, rateLimitResult.retryAfterSeconds);

  const read = await readJsonBody(request);
  if (!read.ok) return read.response;

  // Cap the line count before schema parsing; a real cart has a handful of lines.
  const rawItems = (read.body as { items?: unknown } | null)?.items;
  if (Array.isArray(rawItems) && rawItems.length > MAX_CART_LINES) {
    return NextResponse.json(
      {
        success: false,
        error: "Your cart has too many items. Please split it into smaller orders.",
      },
      { status: 400 }
    );
  }

  const parsed = cartCheckoutSchema.safeParse(read.body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  // Honeypot: return a fake success so the bot doesn't learn it was caught.
  if (payload.company_website) {
    return NextResponse.json({ success: true });
  }

  const turnstileValid = await verifyTurnstileToken(payload.turnstileToken, ip);
  if (!turnstileValid) {
    return NextResponse.json(
      { success: false, error: "CAPTCHA verification failed. Please try again." },
      { status: 400 }
    );
  }

  // Nothing is trusted from the client: every line is validated (product
  // exists, color is required and exact for colored products, minimum order
  // met) and priced here from the same catalog data the site renders. The
  // shared tier comes from the product's total quantity across color lines,
  // using the same rule as the cart page (src/lib/cartPricing.ts).
  const lookup = (productId: string): CartPricingProduct | undefined => {
    const product = getProductById(productId);
    return product
      ? { id: product.id, name: product.name, colors: product.colors, tiers: product.priceTiers }
      : undefined;
  };
  const lines = payload.items.map((item) => ({
    productId: item.productId,
    color: cleanLineColor(item.color),
    quantity: item.quantity,
    sizes: cleanLineDetail(item.sizes),
    imprintNotes: cleanLineDetail(item.imprintNotes),
  }));
  const validation = validateCart(lines, lookup);
  if (!validation.ok) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  // The confirmation goes to the typed-in address, so cap how often one address can be targeted.
  const targetLimit = await checkRateLimit(
    `cart-email:${emailKey(payload.email)}`,
    EMAIL_TARGET_POLICY
  );
  if (!targetLimit.success) return tooManyRequests(undefined, targetLimit.retryAfterSeconds);

  const pricedItems: PricedCartLineItem[] = validation.pricing.lines.map(
    ({ line, unitPrice, lineTotal }) => {
      const product = getProductById(line.productId)!;
      // Backend-only supplier lookup for whoever places the ESP order. Looked up
      // by our own product id, never taken from the client, and never returned
      // in the API response.
      const esp = getEspLink(product);
      return {
        productId: product.id,
        name: product.name,
        ...(line.color ? { color: line.color } : {}),
        quantity: line.quantity,
        ...(line.sizes ? { sizes: line.sizes } : {}),
        ...(line.imprintNotes ? { imprintNotes: line.imprintNotes } : {}),
        unitPrice,
        lineTotal,
        espUrl: esp.url,
        espKind: esp.kind,
        ...(esp.supplier ? { supplier: esp.supplier } : {}),
        ...(esp.asi ? { asi: esp.asi } : {}),
        ...(esp.productNo ? { productNo: esp.productNo } : {}),
      };
    }
  );

  const totalUnits = pricedItems.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal =
    Math.round(pricedItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const uniqueNames = Array.from(new Set(pricedItems.map((item) => item.name)));
  const productSummary =
    pricedItems.length === 1
      ? `${pricedItems[0].name}${pricedItems[0].color ? ` (${pricedItems[0].color})` : ""}`
      : `${pricedItems.length} items (${uniqueNames.join(", ")})`;

  let orderRef: string | undefined;
  let confirmationEmailed = false;

  try {
    // No supplier order is ever placed automatically here — this just
    // records the cart and notifies the business. An admin manually orders
    // through ESP and advances status from the dashboard.
    const submissionId = await recordSubmission("merch_order", {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      product: productSummary,
      quantity: String(totalUnits),
      notes: payload.notes || "",
      items: pricedItems,
      total: grandTotal,
      status: "new",
    });

    // Undefined only if the database write failed (it logs rather than throws).
    orderRef = submissionId !== undefined ? formatOrderReference(submissionId) : undefined;

    const notification = await sendCartOrderNotification({
      orderRef,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      notes: payload.notes || "",
      items: pricedItems,
      total: grandTotal,
    });
    if (!notification.sent) {
      // The reason (missing email key, provider rejection) is for the server
      // log only; the shopper gets the generic message with our contact details.
      console.error(
        `[api/merchant/cart-checkout] business notification not sent (${notification.reason ?? "unknown reason"}); order ${orderRef ?? "(not saved)"}`
      );
      return NextResponse.json(
        { success: false, error: cartSendFailureMessage() },
        { status: 503 }
      );
    }

    // Acknowledge the request to the customer. This must never block or fail
    // the order: it is already saved and the business already notified.
    try {
      const confirmation = await sendMerchRequestConfirmation({
        email: payload.email,
        firstName: payload.firstName,
        orderRef,
        // Only customer-safe fields: no ESP url/supplier/product number.
        items: pricedItems.map(
          ({ name, color, quantity, sizes, imprintNotes, unitPrice, lineTotal }) => ({
            name,
            ...(color ? { color } : {}),
            ...(sizes ? { sizes } : {}),
            ...(imprintNotes ? { imprintNotes } : {}),
            quantity,
            unitPrice,
            lineTotal,
          })
        ),
        total: grandTotal,
        notes: payload.notes || "",
      });
      confirmationEmailed = confirmation.sent;
    } catch (confirmationError) {
      console.error("[api/merchant/cart-checkout] confirmation email failed:", confirmationError);
    }
  } catch (error) {
    console.error("[api/merchant/cart-checkout] failed:", error);
    return NextResponse.json(
      { success: false, error: cartSendFailureMessage() },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    ...(orderRef ? { orderRef } : {}),
    confirmationEmailed,
  });
}
