import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(payload: string): string {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!)
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(username: string): string {
  const payload = JSON.stringify({ username, exp: Date.now() + SESSION_TTL_MS });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export interface AdminSession {
  username: string;
}

export function verifySessionToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { exp, username } = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
    if (typeof exp !== "number" || Date.now() >= exp) return null;
    if (typeof username !== "string") return null;
    return { username };
  } catch {
    return null;
  }
}

// Gates the one-off schema-migration endpoint only — not used for regular
// per-user admin login, which is verified against admin_users in the DB.
export function verifyMigratePassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
