import { NextRequest, NextResponse } from "next/server";
import { paymentRequestSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  CHECKOUT_EMAIL_POLICY,
  CHECKOUT_GLOBAL_POLICY,
  CHECKOUT_IP_POLICY,
} from "@/lib/rateLimitPolicies";
import { createPaymentLink } from "@/lib/square";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendPaymentRequestNotification } from "@/lib/email";
import { recordSubmission } from "@/lib/submissions";
import { emailKey, getClientIp, readJsonBody, serverError, tooManyRequests } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Every successful call creates a real Square payment link and an email to
  // the business inbox, so three independent ceilings apply: per IP, per
  // customer email, and site-wide (bounds the damage from a botnet).
  const ipLimit = await checkRateLimit(`checkout-ip:${ip}`, CHECKOUT_IP_POLICY);
  if (!ipLimit.success) return tooManyRequests(undefined, ipLimit.retryAfterSeconds);

  const read = await readJsonBody(request);
  if (!read.ok) return read.response;

  const parsed = paymentRequestSchema.safeParse(read.body);
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

  // Bot check, same pattern as the other public forms. verifyTurnstileToken skips
  // verification when TURNSTILE_SECRET_KEY isn't configured (local dev, tests). The
  // token isn't part of the payment schema (which strips unknown keys, so it never
  // reaches the stored record), so it is read from the raw body.
  const rawToken = (read.body as { turnstileToken?: unknown } | null)?.turnstileToken;
  const turnstileValid = await verifyTurnstileToken(
    typeof rawToken === "string" ? rawToken : undefined,
    ip
  );
  if (!turnstileValid) {
    return NextResponse.json(
      { success: false, error: "CAPTCHA verification failed. Please try again." },
      { status: 400 }
    );
  }

  const emailLimit = await checkRateLimit(
    `checkout-email:${emailKey(payload.email)}`,
    CHECKOUT_EMAIL_POLICY
  );
  if (!emailLimit.success) return tooManyRequests(undefined, emailLimit.retryAfterSeconds);

  const globalLimit = await checkRateLimit("checkout-global", CHECKOUT_GLOBAL_POLICY);
  if (!globalLimit.success) {
    console.error("[api/checkout] site-wide payment link ceiling reached; refusing new links");
    return tooManyRequests(undefined, globalLimit.retryAfterSeconds);
  }

  const amountCents = Math.round(payload.amount * 100);

  try {
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
    recordSubmission("payment_request", {
      ...payload,
      checkoutUrl: checkout.url,
      paymentLinkId: checkout.id,
    });
    sendPaymentRequestNotification(payload).catch((error) => {
      console.error("[api/checkout] notification email failed:", error);
    });

    return NextResponse.json({ success: true, url: checkout.url });
  } catch (error) {
    console.error("[api/checkout] failed:", error instanceof Error ? error.message : error);
    return serverError("Something went wrong creating your payment link. Please try again.");
  }
}
