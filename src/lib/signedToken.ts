import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless HMAC-SHA256 session tokens shared by the admin and client logins.
 * Token format: base64url(JSON payload) + "." + base64url(HMAC of that part).
 *
 * Failure modes are deliberately asymmetric: verifying with a missing or weak
 * secret returns null (nobody is logged in), while signing with one throws a
 * SessionConfigError so a login route can answer 503 instead of minting a
 * token that anyone could forge.
 */

/** Below this the secret is rejected outright. */
export const MIN_SECRET_LENGTH = 16;
/** Below this the secret still works but a loud warning is logged. */
export const RECOMMENDED_SECRET_LENGTH = 32;
/** Real tokens are a couple hundred bytes; refuse to HMAC anything absurd. */
const MAX_TOKEN_LENGTH = 2048;

export type SessionSecretName = "ADMIN_SESSION_SECRET" | "CLIENT_SESSION_SECRET";

export class SessionConfigError extends Error {
  constructor(name: SessionSecretName) {
    super(`${name} is missing or too short`);
    this.name = "SessionConfigError";
  }
}

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.error(message);
}

/** Returns the usable secret, or null when it is unset or shorter than MIN_SECRET_LENGTH. */
export function readSessionSecret(name: SessionSecretName): string | null {
  const secret = process.env[name];
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    warnOnce(
      `${name}:invalid`,
      `[auth] ${name} is not set or is shorter than ${MIN_SECRET_LENGTH} characters — sign-in is disabled and existing sessions are rejected. ` +
        `Set it to a random value of at least ${RECOMMENDED_SECRET_LENGTH} characters (for example: openssl rand -base64 48).`
    );
    return null;
  }
  if (secret.length < RECOMMENDED_SECRET_LENGTH) {
    warnOnce(
      `${name}:weak`,
      `[auth] ${name} is shorter than the recommended ${RECOMMENDED_SECRET_LENGTH} characters. Rotate it to a longer random value.`
    );
  }
  return secret;
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSignedToken(
  secretName: SessionSecretName,
  claims: Record<string, string>,
  ttlMs: number
): string {
  const secret = readSessionSecret(secretName);
  if (!secret) throw new SessionConfigError(secretName);
  const encoded = Buffer.from(JSON.stringify({ ...claims, exp: Date.now() + ttlMs })).toString(
    "base64url"
  );
  return `${encoded}.${sign(secret, encoded)}`;
}

/** Returns the verified claims (including exp) or null. Never throws. */
export function verifySignedToken(
  secretName: SessionSecretName,
  token: string | undefined
): Record<string, unknown> | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const secret = readSessionSecret(secretName);
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const a = Buffer.from(signature);
  const b = Buffer.from(sign(secret, encoded));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const claims = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (typeof claims !== "object" || claims === null) return null;
    if (typeof claims.exp !== "number" || Date.now() >= claims.exp) return null;
    return claims as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Test hook: lets a test re-trigger the one-time warnings. */
export function __resetSessionWarningsForTests() {
  warned.clear();
}

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "strict";
  path: "/";
  maxAge: number;
}

/** Secure is off only outside production so http://localhost dev logins still work in Safari. */
export function sessionCookieOptions(
  ttlMs: number,
  sameSite: "lax" | "strict"
): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite,
    path: "/",
    maxAge: Math.floor(ttlMs / 1000),
  };
}
