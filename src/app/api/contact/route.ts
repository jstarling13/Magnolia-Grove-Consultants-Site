import { NextRequest, NextResponse } from "next/server";
import { contactSubmissionSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import { EMAIL_TARGET_POLICY, FORM_POLICY } from "@/lib/rateLimitPolicies";
import { emailKey, getClientIp, readJsonBody, tooManyRequests } from "@/lib/http";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  sendLeadNotification,
  sendLeadAutoResponder,
  sendStrategySessionNotification,
  sendStrategySessionAutoResponder,
} from "@/lib/email";
import { recordSubmission } from "@/lib/submissions";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit first — cheapest check, blocks floods before touching
  // validation, Turnstile, or email sending.
  const rateLimitResult = await checkRateLimit(ip, FORM_POLICY);
  if (!rateLimitResult.success)
    return tooManyRequests(undefined, rateLimitResult.retryAfterSeconds);

  const read = await readJsonBody(request);
  if (!read.ok) return read.response;

  const parsed = contactSubmissionSchema.safeParse(read.body);
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

  // The auto-responder goes to whatever address was typed in, so cap how many
  // times one address can be targeted (stops using us to mail-bomb someone).
  const targetLimit = await checkRateLimit(
    `contact-email:${emailKey(payload.email)}`,
    EMAIL_TARGET_POLICY
  );
  if (!targetLimit.success) return tooManyRequests(undefined, targetLimit.retryAfterSeconds);

  // Bot-protection fields are not business data; keep them out of the database.
  const { turnstileToken: _turnstileToken, company_website: _honeypot, ...stored } = payload;

  try {
    if (payload.formType === "lead") {
      await recordSubmission("lead", stored);
      const notification = await sendLeadNotification(payload);
      await sendLeadAutoResponder(payload);
      if (!notification.sent) {
        return NextResponse.json(
          { success: false, error: "Email delivery is not configured yet." },
          { status: 503 }
        );
      }
    } else {
      await recordSubmission("strategy_session", stored);
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
