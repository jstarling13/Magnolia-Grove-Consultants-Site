import { NextRequest, NextResponse } from "next/server";
import { cartCheckoutSchema, type PricedCartLineItem } from "@/lib/merchOrders";
import { getProductById } from "@/config/merchandiseConfig";
import { cleanLineColor, validateCart, type CartPricingProduct } from "@/lib/cartPricing";
import { checkRateLimit } from "@/lib/ratelimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendCartOrderNotification } from "@/lib/email";
import { recordSubmission } from "@/lib/submissions";
import { getEspLink } from "@/lib/espLinks";

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
  }));
  const validation = validateCart(lines, lookup);
  if (!validation.ok) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

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
