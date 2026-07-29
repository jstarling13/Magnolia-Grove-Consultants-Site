import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { CLIENT_SESSION_COOKIE, createClientSessionToken } from "@/lib/clientAuth";
import { createClientUser } from "@/lib/clientUsers";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rateLimitResult = await checkRateLimit(`account-signup:${ip}`);
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

  const { email, password, firstName, lastName, phone, orgName } = body as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { success: false, error: "Enter a valid email address." },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { success: false, error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (typeof firstName !== "string" || !firstName.trim()) {
    return NextResponse.json({ success: false, error: "First name is required." }, { status: 400 });
  }
  if (typeof lastName !== "string" || !lastName.trim()) {
    return NextResponse.json({ success: false, error: "Last name is required." }, { status: 400 });
  }

  const result = await createClientUser({
    email,
    password,
    firstName,
    lastName,
    phone: typeof phone === "string" ? phone : "",
    orgName: typeof orgName === "string" ? orgName : "",
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(CLIENT_SESSION_COOKIE, createClientSessionToken(email), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
