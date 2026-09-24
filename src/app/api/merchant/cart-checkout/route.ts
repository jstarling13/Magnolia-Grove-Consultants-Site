import { NextRequest, NextResponse } from "next/server";
import { cartCheckoutSchema, type PricedCartLineItem } from "@/lib/merchOrders";
import { getProductById, tierForQuantity } from "@/config/merchandiseConfig";
import { checkRateLimit } from "@/lib/ratelimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendCartOrderNotification } from "@/lib/email";
import { recordSubmission } from "@/lib/submissions";

export const runtime = "nodejs";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rateLimitResult = await checkRateLimit(ip);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = cartCheckoutSchema.safeParse(body);
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

  // Prices are never trusted from the client — every line is recalculated
  // here from the same catalog data the site renders, using each product's
  // real ESP-derived quantity-break pricing.
  const pricedItems: PricedCartLineItem[] = [];
  for (const item of payload.items) {
    const product = getProductById(item.productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Your cart contains a product that's no longer available." },
        { status: 400 }
      );
    }
    const tier = tierForQuantity(product, item.quantity);
    pricedItems.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice: tier.price,
      lineTotal: Math.round(tier.price * item.quantity * 100) / 100,
    });
  }

  const totalUnits = pricedItems.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = Math.round(pricedItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const productSummary =
    pricedItems.length === 1
      ? pricedItems[0].name
      : `${pricedItems.length} items (${pricedItems.map((item) => item.name).join(", ")})`;

  try {
    // No supplier order is ever placed automatically here — this just
    // records the cart and notifies the business. An admin manually orders
    // through ESP and advances status from the dashboard.
    await recordSubmission("merch_order", {
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

    const notification = await sendCartOrderNotification({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      notes: payload.notes || "",
      items: pricedItems,
      total: grandTotal,
    });
    if (!notification.sent) {
      return NextResponse.json(
        { success: false, error: "Email delivery is not configured yet." },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("[api/merchant/cart-checkout] failed:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong sending your order. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
