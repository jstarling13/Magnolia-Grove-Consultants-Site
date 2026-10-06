import { sql } from "./db";
import { verifySessionToken, type AdminSession } from "./adminAuth";

/**
 * Server-side revocation for the otherwise stateless admin session tokens.
 *
 * One row per admin username holds a "valid after" timestamp (ms since epoch).
 * Tokens carry the time they were issued (`iat`); a token issued before its
 * user's valid-after time is rejected. Signing out, and resetting admin
 * passwords, set valid-after to now, so a copied cookie stops working the
 * moment its owner signs out instead of surviving until it expires.
 *
 * Tokens that predate this feature have no `iat` and count as issued at time 0,
 * so they are rejected once their user has any revocation row. They expire on
 * their own within 24 hours anyway.
 *
 * Checked wherever admin data is read or changed (pages, server actions,
 * export route). Middleware only verifies the signature, because it must stay
 * free of database calls; it is a redirect convenience, not the security boundary.
 */

let tableReady: Promise<void> | undefined;

function ensureTable(): Promise<void> {
  tableReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS admin_session_revocations (
        username TEXT PRIMARY KEY,
        valid_after_ms BIGINT NOT NULL
      )
    `;
  })().catch((error) => {
    tableReady = undefined; // retry on the next call instead of caching the failure
    throw error;
  });
  return tableReady;
}

/** Usernames are matched case-insensitively, like login. */
function key(username: string): string {
  return username.trim().toLowerCase();
}

/** Invalidates every session this admin has issued up to now. */
export async function revokeAdminSessions(username: string, now = Date.now()): Promise<void> {
  await ensureTable();
  await sql`
    INSERT INTO admin_session_revocations (username, valid_after_ms)
    VALUES (${key(username)}, ${now})
    ON CONFLICT (username) DO UPDATE
      SET valid_after_ms = GREATEST(admin_session_revocations.valid_after_ms, excluded.valid_after_ms)
  `;
}

/**
 * True when the session was issued before its user's revocation time. Fails
 * closed: if the check itself cannot run, the session is treated as revoked.
 */
export async function isAdminSessionRevoked(session: AdminSession): Promise<boolean> {
  try {
    await ensureTable();
    const rows = (await sql`
      SELECT valid_after_ms FROM admin_session_revocations WHERE username = ${key(session.username)}
    `) as { valid_after_ms: string | number }[];
    const validAfter = Number(rows?.[0]?.valid_after_ms ?? 0);
    return Number.isFinite(validAfter) && session.issuedAt < validAfter;
  } catch (error) {
    console.error("[adminSessions] revocation check failed; refusing the session:", error);
    return true;
  }
}

/** A verified, non-revoked admin session, or null. */
export async function getVerifiedAdminSession(
  token: string | undefined
): Promise<AdminSession | null> {
  const session = verifySessionToken(token);
  if (!session) return null;
  return (await isAdminSessionRevoked(session)) ? null : session;
}
