import { NextResponse } from "next/server";

/**
 * Small helpers shared by the public API routes: client IP extraction, a
 * bounded JSON body reader, and error responses that never carry internals.
 */

/** Largest JSON body a public form endpoint will buffer. Real submissions are a few KB. */
export const MAX_JSON_BODY_BYTES = 64 * 1024;

/**
 * Best-effort client IP. On Vercel the platform overwrites these headers, so
 * they cannot be spoofed by the caller; behind any other proxy the first
 * x-forwarded-for hop is client-controlled and rate limits keyed on it are
 * only advisory.
 */
export function getClientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim() || "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim() || "unknown";
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim() || "unknown";
  return "unknown";
}

export type JsonBodyResult = { ok: true; body: unknown } | { ok: false; response: NextResponse };

/**
 * Reads and parses a JSON request body, refusing anything larger than
 * maxBytes (413) or not valid JSON (400). The size is enforced while
 * streaming so a client that lies about, or omits, Content-Length still
 * can't make the server buffer an unbounded body.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES
): Promise<JsonBodyResult> {
  const tooLarge = () => ({
    ok: false as const,
    response: NextResponse.json(
      { success: false, error: "Request body is too large." },
      { status: 413 }
    ),
  });
  const invalid = () => ({
    ok: false as const,
    response: NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    ),
  });

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge();

  if (!request.body) return invalid();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return tooLarge();
      }
      chunks.push(value);
    }
  } catch {
    return invalid();
  }

  try {
    return { ok: true, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return invalid();
  }
}

/** Generic 500 for unexpected failures; the real error is logged by the caller. */
export function serverError(message = "Something went wrong. Please try again."): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

/** 429 with a Retry-After hint. */
export function tooManyRequests(
  message = "Too many requests. Please try again later.",
  retryAfterSeconds = 60
): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/** Normalizes an email for use as a rate-limit key (case-insensitive, trimmed). */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}
