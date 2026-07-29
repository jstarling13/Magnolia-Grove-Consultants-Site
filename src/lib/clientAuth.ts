import { createHmac, timingSafeEqual } from "crypto";

export const CLIENT_SESSION_COOKIE = "client_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sign(payload: string): string {
  return createHmac("sha256", process.env.CLIENT_SESSION_SECRET!)
    .update(payload)
    .digest("base64url");
}

export function createClientSessionToken(email: string): string {
  const payload = JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export interface ClientSession {
  email: string;
}

export function verifyClientSessionToken(token: string | undefined): ClientSession | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { exp, email } = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
    if (typeof exp !== "number" || Date.now() >= exp) return null;
    if (typeof email !== "string") return null;
    return { email };
  } catch {
    return null;
  }
}
