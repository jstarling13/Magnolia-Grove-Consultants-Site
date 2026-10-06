import type { RateLimitPolicy } from "./ratelimit";

/**
 * Named limits for the public endpoints. Kept in a data-only module so route
 * tests can mock checkRateLimit without losing the policy definitions.
 *
 * failClosed means: if the limiter backend (Upstash) errors, refuse the
 * request instead of letting it through. Used where a flood is costly or the
 * endpoint guards credentials.
 */

/** Public form submissions (contact, order requests): the original 5 per 10 minutes per IP. */
export const FORM_POLICY: RateLimitPolicy = { name: "contact", limit: 5, windowSeconds: 600 };

/** Customers can retry a typo'd cart a few times; more than this from one IP is automation. */
export const CART_POLICY: RateLimitPolicy = { name: "cart", limit: 10, windowSeconds: 3600 };

/** Mail sent to a customer-supplied address (confirmations, auto-responders): stops mail-bombing a third party. */
export const EMAIL_TARGET_POLICY: RateLimitPolicy = {
  name: "email-target",
  limit: 3,
  windowSeconds: 3600,
};

/** Square payment links are created on demand; per-IP cap. */
export const CHECKOUT_IP_POLICY: RateLimitPolicy = {
  name: "checkout-ip",
  limit: 5,
  windowSeconds: 3600,
  failClosed: true,
};

/** Per customer email on /api/checkout. */
export const CHECKOUT_EMAIL_POLICY: RateLimitPolicy = {
  name: "checkout-email",
  limit: 3,
  windowSeconds: 3600,
  failClosed: true,
};

/** Site-wide ceiling on payment links so a botnet with many IPs and emails still has a bounded blast radius. */
export const CHECKOUT_GLOBAL_POLICY: RateLimitPolicy = {
  name: "checkout-global",
  limit: 100,
  windowSeconds: 3600,
  failClosed: true,
};

/** Password logins, per IP. */
export const LOGIN_IP_POLICY: RateLimitPolicy = {
  name: "login-ip",
  limit: 10,
  windowSeconds: 900,
  failClosed: true,
};

/** Password logins, per account name, so a distributed guess against one account is also throttled. */
export const LOGIN_ACCOUNT_POLICY: RateLimitPolicy = {
  name: "login-account",
  limit: 10,
  windowSeconds: 900,
  failClosed: true,
};

/** Account creation, per IP. */
export const SIGNUP_POLICY: RateLimitPolicy = {
  name: "signup",
  limit: 5,
  windowSeconds: 3600,
  failClosed: true,
};

/** The one-off migration endpoint is a single shared password; throttle hard. */
export const MIGRATE_POLICY: RateLimitPolicy = {
  name: "migrate",
  limit: 5,
  windowSeconds: 900,
  failClosed: true,
};

/** Unauthenticated catalog search proxy that spends vendor API quota. */
export const CATALOG_POLICY: RateLimitPolicy = { name: "catalog", limit: 30, windowSeconds: 600 };

/** Logo uploads, per IP. One logo per order is typical; a few retries are allowed. */
export const LOGO_UPLOAD_IP_POLICY: RateLimitPolicy = {
  name: "logo-upload-ip",
  limit: 12,
  windowSeconds: 3600,
  failClosed: true,
};

/** Logo uploads, per order, so a leaked upload token cannot be hammered from many addresses. */
export const LOGO_UPLOAD_ORDER_POLICY: RateLimitPolicy = {
  name: "logo-upload-order",
  limit: 8,
  windowSeconds: 3600,
  failClosed: true,
};
