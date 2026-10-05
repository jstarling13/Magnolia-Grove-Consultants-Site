import { createHmac, timingSafeEqual } from "node:crypto";
import { formatOrderReference } from "./merchOrders";
import { getSiteUrl } from "./siteUrl";

/**
 * Signed order-status links.
 *
 * A customer's "Track your order" link carries a token: base64url of
 * HMAC-SHA256(ORDER_LINK_SECRET, canonical order reference). Only someone who
 * received the email can open the page, and a token for one order is useless
 * for any other. The secret never leaves the server. When it is unset (or too
 * short to be safe) the whole feature is off: no links are generated and the
 * page answers 404.
 */

/** Shorter secrets are treated as unset so a weak value can't quietly be used. */
export const MIN_SECRET_LENGTH = 16;

/** Highest id a Postgres SERIAL (int4) column can hold. */
const MAX_ORDER_ID = 2_147_483_647;

/** The configured secret, or undefined when order links are disabled. */
export function getOrderLinkSecret(): string | undefined {
  const secret = process.env.ORDER_LINK_SECRET?.trim();
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : undefined;
}

export function isOrderTrackingEnabled(): boolean {
  return getOrderLinkSecret() !== undefined;
}

/**
 * Parses what a customer (or a URL) might hold for an order reference:
 * "MG-00042", "mg-00042", "  MG-42 ". Returns the numeric id, or undefined for
 * anything that isn't a plausible id (wrong shape, zero, or too large for the
 * database to hold, so a hostile value can never reach a query).
 */
export function parseOrderRef(input: unknown): number | undefined {
  if (typeof input !== "string") return undefined;
  const match = /^MG-(\d{1,12})$/.exec(input.trim().toUpperCase());
  if (!match) return undefined;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id >= 1 && id <= MAX_ORDER_ID ? id : undefined;
}

/** parseOrderRef for a URL path segment, which may still be percent-encoded ("%20MG-00042"). */
export function parseOrderRefParam(segment: string): number | undefined {
  try {
    return parseOrderRef(decodeURIComponent(segment));
  } catch {
    return undefined;
  }
}

function sign(secret: string, canonicalRef: string): Buffer {
  return createHmac("sha256", secret).update(canonicalRef).digest();
}

/** Token for an order id, or undefined when order links are disabled. */
export function createOrderToken(orderId: number): string | undefined {
  const secret = getOrderLinkSecret();
  if (!secret || !Number.isSafeInteger(orderId) || orderId < 1) return undefined;
  return sign(secret, formatOrderReference(orderId)).toString("base64url");
}

/**
 * Checks a token against an order id in constant time. False when the feature
 * is disabled, the token is missing or malformed, or it belongs to a
 * different order.
 */
export function verifyOrderToken(orderId: number, token: unknown): boolean {
  const secret = getOrderLinkSecret();
  if (!secret || typeof token !== "string") return false;
  // Exactly 32 bytes of base64url (43 chars, no padding). Anything else is
  // rejected up front so the comparison below always sees equal lengths.
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const provided = Buffer.from(token, "base64url");
  if (provided.length !== 32 || provided.toString("base64url") !== token) return false;
  return timingSafeEqual(provided, sign(secret, formatOrderReference(orderId)));
}

/**
 * Absolute "Track your order" URL for an order, or undefined when order links
 * are disabled (callers then simply leave the link out).
 */
export function buildOrderTrackingUrl(orderId: number): string | undefined {
  const token = createOrderToken(orderId);
  if (!token) return undefined;
  return `${getSiteUrl()}/orders/${formatOrderReference(orderId)}?t=${token}`;
}

/** "pat@example.com" becomes "p***@example.com". Anything unparseable is fully hidden. */
export function maskEmail(email: unknown): string {
  if (typeof email !== "string") return "";
  const value = email.trim();
  const at = value.lastIndexOf("@");
  if (at < 1 || at === value.length - 1) return "";
  return `${value[0]}***${value.slice(at)}`;
}
