import { NextRequest, NextResponse } from "next/server";
import { contactSubmissionSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  sendLeadNotification,
  sendLeadAutoResponder,
  sendStrategySessionNotification,
  sendStrategySessionAutoResponder,
} from "@/lib/email";

export const runtime = "nodejs";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit first — cheapest check, blocks floods before touching
  // validation, Turnstile, or email sending.
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

  const parsed = contactSubmissionSchema.safeParse(body);
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
    if (payload.formType === "lead") {
      const notification = await sendLeadNotification(payload);
      await sendLeadAutoResponder(payload);
      if (!notification.sent) {
        return NextResponse.json(
          { success: false, error: "Email delivery is not configured yet." },
          { status: 503 }
        );
      }
    } else {
      const notification = await sendStrategySessionNotification(payload);
      await sendStrategySessionAutoResponder(payload);
      if (!notification.sent) {
        return NextResponse.json(
          { success: false, error: "Email delivery is not configured yet." },
          { status: 503 }
        );
      }
    }
  } catch (error) {
    console.error("[api/contact] email send failed:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong sending your request. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
