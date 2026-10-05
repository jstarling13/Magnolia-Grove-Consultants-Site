import { NextRequest, NextResponse } from "next/server";
import {
  RELEVANT_EVENT_TYPES,
  SQUARE_SIGNATURE_HEADER,
  readBodyWithLimit,
  verifySquareSignature,
} from "@/lib/squareWebhook";
import { syncAllAwaitingMerchPayments } from "@/lib/merchPayments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Square webhook receiver. Order of operations matters because the route is
 * public: configuration check, cheap header/size gates, signature check, and
 * only then JSON parsing and any database or Square API work. Secrets and raw
 * bodies are never logged.
 */
export async function POST(request: NextRequest) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  if (!signatureKey || !notificationUrl) {
    console.warn("[square-webhook] rejected: webhook env vars not configured");
    return new NextResponse(null, { status: 503 });
  }

  const signature = request.headers.get(SQUARE_SIGNATURE_HEADER);
  if (!signature) {
    console.warn("[square-webhook] rejected: missing signature header");
    return new NextResponse(null, { status: 403 });
  }

  const body = await readBodyWithLimit(request);
  if (!body.ok) {
    console.warn("[square-webhook] rejected: body too large");
    return new NextResponse(null, { status: 413 });
  }

  if (!verifySquareSignature({ signatureKey, notificationUrl, rawBody: body.text, signature })) {
    console.warn("[square-webhook] rejected: invalid signature");
    return new NextResponse(null, { status: 403 });
  }

  let eventType: unknown;
  try {
    eventType = (JSON.parse(body.text) as { type?: unknown }).type;
  } catch {
    console.warn("[square-webhook] rejected: signed body is not valid JSON");
    return new NextResponse(null, { status: 400 });
  }

  if (typeof eventType !== "string" || !RELEVANT_EVENT_TYPES.has(eventType)) {
    console.info("[square-webhook] ignored event type");
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const examined = await syncAllAwaitingMerchPayments();
    console.info(`[square-webhook] ${eventType} processed; checked ${examined} awaiting order(s)`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[square-webhook] sync failed:", error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 500 });
  }
}
