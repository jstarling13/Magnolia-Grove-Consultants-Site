import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { ADMIN_SESSION_COOKIE, createSessionToken, verifyPassword } from "@/lib/adminAuth";

export const runtime = "nodejs";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rateLimitResult = await checkRateLimit(`admin-login:${ip}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const password = (body as { password?: unknown }).password;
  if (typeof password !== "string" || !verifyPassword(password)) {
    return NextResponse.json({ success: false, error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
