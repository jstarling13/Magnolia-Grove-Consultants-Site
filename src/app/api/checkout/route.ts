import { NextRequest, NextResponse } from "next/server";
import { paymentRequestSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import { createPaymentLink } from "@/lib/square";
import { sendPaymentRequestNotification } from "@/lib/email";

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

  const parsed = paymentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  // Honeypot: a filled hidden field means a bot filled every input on the
  // form. Return a fake success so the bot doesn't learn it was caught.
  if (payload.company_website) {
    return NextResponse.json({ success: true, url: null });
  }

  const amountCents = Math.round(payload.amount * 100);

  const checkout = await createPaymentLink({
    organizationName: payload.organizationName,
    memo: payload.memo,
    amountCents,
    buyerEmail: payload.email,
  });

  if (!checkout.url) {
    const message =
      checkout.error === "not_configured"
        ? "Online payments aren't set up yet. Please contact us directly to arrange payment."
        : "Something went wrong creating your payment link. Please try again or contact us directly.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }

  // Internal record of the request — best-effort, doesn't block checkout.
  sendPaymentRequestNotification(payload).catch((error) => {
    console.error("[api/checkout] notification email failed:", error);
  });

  return NextResponse.json({ success: true, url: checkout.url });
}
