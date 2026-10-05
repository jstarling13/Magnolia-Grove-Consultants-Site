import { createHmac, timingSafeEqual } from "node:crypto";

/** Header Square puts the base64 HMAC-SHA256 signature in. */
export const SQUARE_SIGNATURE_HEADER = "x-square-hmacsha256-signature";

/** Square events are a few KB; anything bigger is not a legitimate delivery. */
export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

/** Event types that can mean "an order was paid"; everything else is ignored. */
export const RELEVANT_EVENT_TYPES: ReadonlySet<string> = new Set([
  "payment.updated",
  "payment.created",
  "order.updated",
  "order.fulfillment.updated",
]);

/**
 * Computes the signature Square documents: base64(HMAC-SHA256(key,
 * notificationUrl + rawBody)). The notification URL must be the exact string
 * configured on the webhook subscription in the Square Developer Dashboard,
 * and the body must be the raw text, not re-serialized JSON.
 */
export function computeSquareSignature(
  signatureKey: string,
  notificationUrl: string,
  rawBody: string
): string {
  return createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody)
    .digest("base64");
}

/**
 * Constant-time check of a received signature against the expected one.
 * Both sides are hashed to equal-length digests first so timingSafeEqual never
 * throws on a length mismatch and the comparison time does not depend on how
 * much of the signature matched.
 */
export function verifySquareSignature(params: {
  signatureKey: string;
  notificationUrl: string;
  rawBody: string;
  signature: string | null | undefined;
}): boolean {
  const { signatureKey, notificationUrl, rawBody, signature } = params;
  if (!signatureKey || !notificationUrl || !signature) return false;

  const expected = computeSquareSignature(signatureKey, notificationUrl, rawBody);
  const a = createHmac("sha256", "compare").update(expected).digest();
  const b = createHmac("sha256", "compare").update(signature).digest();
  return timingSafeEqual(a, b);
}

export type BoundedBody = { ok: true; text: string } | { ok: false; reason: "too_large" };

/**
 * Reads the request body as text, giving up as soon as it exceeds the limit so
 * an oversized unauthenticated request never gets buffered in full.
 */
export async function readBodyWithLimit(
  request: Request,
  maxBytes: number = MAX_WEBHOOK_BODY_BYTES
): Promise<BoundedBody> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, reason: "too_large" };

  if (!request.body) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return { ok: false, reason: "too_large" };
    }
    chunks.push(value);
  }
  return { ok: true, text: Buffer.concat(chunks).toString("utf8") };
}
