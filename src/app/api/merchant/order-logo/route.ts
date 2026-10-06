import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { LOGO_UPLOAD_IP_POLICY, LOGO_UPLOAD_ORDER_POLICY } from "@/lib/rateLimitPolicies";
import { getClientIp, readBodyBytes, tooManyRequests } from "@/lib/http";
import { formatOrderReference } from "@/lib/merchOrders";
import { parseOrderRef } from "@/lib/orderTracking";
import { LOGO_BODY_OVERHEAD_BYTES, LOGO_MESSAGES, MAX_LOGO_BYTES } from "@/lib/orderLogo";
import { validateLogoUpload } from "@/lib/orderLogoValidation";
import { verifyLogoUploadToken } from "@/lib/orderLogoToken";
import { addOrderFile } from "@/lib/orderFiles";
import { sendLogoAttachedNotification } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Step two of an order request: attaches the shopper's logo to the order that
 * /api/merchant/cart-checkout just created. multipart/form-data with
 *   orderRef  the reference that route returned (MG-00042)
 *   token     the short-lived upload token it returned with it
 *   file      the logo (one file)
 *
 * CAPTCHA is enforced once, when the order is created: the token is only ever
 * issued after that check passed, is bound to that single order and expires
 * after 15 minutes, so it stands in for a second challenge (Turnstile tokens
 * are single-use and cannot be spent twice). Rate limits apply per address and
 * per order. The order itself is already saved whatever happens here, so every
 * failure is safe for the shopper to ignore; the cart page tells them to reply
 * with the file instead.
 *
 * There is deliberately no GET: uploaded files are never served from a public
 * route. Admins read them through /admin/orders/[id]/files/[fileId].
 */

const GENERIC_FAILURE = "We could not attach your logo.";

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const ipLimit = await checkRateLimit(`logo:${ip}`, LOGO_UPLOAD_IP_POLICY);
  if (!ipLimit.success) return tooManyRequests(undefined, ipLimit.retryAfterSeconds);

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    return fail(415, "Send the logo as multipart/form-data.");
  }

  const read = await readBodyBytes(request, MAX_LOGO_BYTES + LOGO_BODY_OVERHEAD_BYTES);
  if (!read.ok) return fail(413, LOGO_MESSAGES.tooLarge);

  let form: FormData;
  try {
    form = await new Response(new Uint8Array(read.bytes), {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const orderId = parseOrderRef(form.get("orderRef"));
  const token = form.get("token");
  // One generic answer for a missing, forged, expired or other-order token.
  if (orderId === undefined || !verifyLogoUploadToken(token, orderId)) {
    return fail(
      403,
      "This upload link has expired. Please reply to your confirmation email with your logo."
    );
  }

  const orderLimit = await checkRateLimit(`logo-order:${orderId}`, LOGO_UPLOAD_ORDER_POLICY);
  if (!orderLimit.success) return tooManyRequests(undefined, orderLimit.retryAfterSeconds);

  const file = form.get("file");
  if (typeof file === "string" || file === null) return fail(400, "Choose a logo file to attach.");
  if (form.getAll("file").length > 1) return fail(400, "Please attach one logo file at a time.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = validateLogoUpload({ filename: file.name, bytes });
  if (!checked.ok) return fail(checked.status, checked.error);

  let customerName = "";
  try {
    const rows = (await sql`
      SELECT id, type, data FROM submissions WHERE id = ${orderId} AND type = 'merch_order'
    `) as { data?: { firstName?: unknown; lastName?: unknown } }[];
    if (!rows?.[0]) return fail(404, GENERIC_FAILURE);
    const { firstName, lastName } = rows[0].data ?? {};
    customerName = [firstName, lastName].filter((v) => typeof v === "string").join(" ");
  } catch (error) {
    console.error("[api/merchant/order-logo] order lookup failed:", error);
    return fail(500, GENERIC_FAILURE);
  }

  let stored;
  try {
    stored = await addOrderFile(orderId, {
      filename: checked.filename,
      mime: checked.mime,
      bytes,
    });
  } catch (error) {
    console.error(`[api/merchant/order-logo] could not store logo for order ${orderId}:`, error);
    return fail(500, GENERIC_FAILURE);
  }
  if (!stored.ok) return fail(409, LOGO_MESSAGES.tooMany);

  // Best effort: the logo is stored; a failed pointer email must not fail the upload.
  try {
    const sent = await sendLogoAttachedNotification({
      orderId,
      orderRef: formatOrderReference(orderId),
      filename: checked.filename,
      size: checked.size,
      customerName,
    });
    if (!sent.sent) {
      console.error(
        `[api/merchant/order-logo] logo notification not sent (${sent.reason ?? "unknown reason"}); order ${orderId}`
      );
    }
  } catch (error) {
    console.error("[api/merchant/order-logo] logo notification failed:", error);
  }

  return NextResponse.json({ success: true, filename: checked.filename });
}
