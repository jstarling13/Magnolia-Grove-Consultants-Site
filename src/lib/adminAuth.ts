import { createHmac, timingSafeEqual } from "crypto";
import {
  createSignedToken,
  sessionCookieOptions,
  verifySignedToken,
  type SessionCookieOptions,
} from "./signedToken";

export const ADMIN_SESSION_COOKIE = "admin_session";
// Admin sessions can send customer email and create payment links. The token is
// stateless, but sign-out revokes it server-side (see adminSessions.ts); the short
// window still bounds a session whose owner never signs out.
export const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createSessionToken(username: string): string {
  // `iat` lets adminSessions.ts reject tokens issued before a sign-out / password reset.
  return createSignedToken(
    "ADMIN_SESSION_SECRET",
    { username, iat: String(Date.now()) },
    ADMIN_SESSION_TTL_MS
  );
}

/** Strict: the admin cookie is never needed on cross-site navigations. */
export function adminCookieOptions(): SessionCookieOptions {
  return sessionCookieOptions(ADMIN_SESSION_TTL_MS, "strict");
}

export interface AdminSession {
  username: string;
  /** Milliseconds since epoch when the token was issued; 0 for tokens that predate revocation. */
  issuedAt: number;
}

export function verifySessionToken(token: string | undefined): AdminSession | null {
  const claims = verifySignedToken("ADMIN_SESSION_SECRET", token);
  if (!claims || typeof claims.username !== "string" || !claims.username) return null;
  const issuedAt = typeof claims.iat === "string" ? Number(claims.iat) : 0;
  return { username: claims.username, issuedAt: Number.isFinite(issuedAt) ? issuedAt : 0 };
}

/**
 * Gates the one-off schema-migration endpoint only — not used for regular
 * per-user admin login, which is verified against admin_users in the DB.
 *
 * Fails closed: if ADMIN_PASSWORD is unset or empty no candidate is accepted
 * (an empty candidate would otherwise match an empty expected value). Both
 * sides are hashed first so the comparison is constant-time regardless of
 * length.
 */
export function verifyMigratePassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !candidate) return false;
  const a = createHmac("sha256", "migrate-compare").update(candidate).digest();
  const b = createHmac("sha256", "migrate-compare").update(expected).digest();
  return timingSafeEqual(a, b);
}
