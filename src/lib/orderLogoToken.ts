import { createSignedToken, verifySignedToken, type SessionSecretName } from "./signedToken";

/**
 * Short-lived permission to attach a logo to one specific order.
 *
 * The order is created by /api/merchant/cart-checkout (CAPTCHA, rate limits and
 * validation all run there). Its response carries one of these tokens, and the
 * browser presents it, with the order reference, when it uploads the logo to
 * /api/merchant/order-logo. The token is an HMAC-signed claim bound to the
 * order id, so it cannot be used for any other order, and it expires after
 * 15 minutes.
 *
 * It is signed with a session secret that already exists in production
 * (CLIENT_SESSION_SECRET, or ADMIN_SESSION_SECRET when that one is unset), and
 * carries a purpose claim so neither a client login cookie nor an admin
 * session can be replayed as an upload token, or the reverse.
 */

export const LOGO_UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;
const PURPOSE = "order-logo-upload";
const SECRETS: SessionSecretName[] = ["CLIENT_SESSION_SECRET", "ADMIN_SESSION_SECRET"];

/** A token for this order, or null when no signing secret is configured (uploads are then switched off). */
export function createLogoUploadToken(orderId: number): string | null {
  if (!Number.isSafeInteger(orderId) || orderId < 1) return null;
  for (const secret of SECRETS) {
    try {
      return createSignedToken(
        secret,
        { purpose: PURPOSE, order: String(orderId) },
        LOGO_UPLOAD_TOKEN_TTL_MS
      );
    } catch {
      // This secret is missing or too short; try the next one.
    }
  }
  return null;
}

/** True only for an unexpired token that was issued for exactly this order. */
export function verifyLogoUploadToken(token: unknown, orderId: number): boolean {
  if (typeof token !== "string" || !token) return false;
  for (const secret of SECRETS) {
    const claims = verifySignedToken(secret, token);
    if (!claims) continue;
    return claims.purpose === PURPOSE && claims.order === String(orderId);
  }
  return false;
}
