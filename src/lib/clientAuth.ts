import {
  createSignedToken,
  sessionCookieOptions,
  verifySignedToken,
  type SessionCookieOptions,
} from "./signedToken";

export const CLIENT_SESSION_COOKIE = "client_session";
export const CLIENT_SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function createClientSessionToken(email: string): string {
  return createSignedToken("CLIENT_SESSION_SECRET", { email }, CLIENT_SESSION_TTL_MS);
}

/** Lax so a link from a confirmation email lands the customer signed in. */
export function clientCookieOptions(): SessionCookieOptions {
  return sessionCookieOptions(CLIENT_SESSION_TTL_MS, "lax");
}

export interface ClientSession {
  email: string;
}

export function verifyClientSessionToken(token: string | undefined): ClientSession | null {
  const claims = verifySignedToken("CLIENT_SESSION_SECRET", token);
  if (!claims || typeof claims.email !== "string" || !claims.email) return null;
  return { email: claims.email };
}
