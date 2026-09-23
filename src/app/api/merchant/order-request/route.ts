import { NextRequest, NextResponse } from "next/server";
import { merchOrderRequestSchema } from "@/lib/merchOrders";
import { checkRateLimit } from "@/lib/ratelimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendMerchOrderNotification } from "@/lib/email";
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

  const parsed = merchOrderRequestSchema.safeParse(body);
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

  try {
    // No supplier order is ever placed automatically here — this just
    // records the request and notifies the business. An admin manually
    // orders through ESP and advances status from the dashboard.
    await recordSubmission("merch_order", {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      product: payload.product,
      quantity: payload.quantity,
      budget: payload.budget || "",
      deadline: payload.deadline || "",
      notes: payload.notes || "",
      status: "new",
    });

    const notification = await sendMerchOrderNotification(payload);
    if (!notification.sent) {
      return NextResponse.json(
        { success: false, error: "Email delivery is not configured yet." },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("[api/merchant/order-request] failed:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong sending your request. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
