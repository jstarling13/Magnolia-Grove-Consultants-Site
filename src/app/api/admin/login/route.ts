import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";
import { LOGIN_ACCOUNT_POLICY, LOGIN_IP_POLICY } from "@/lib/rateLimitPolicies";
import { adminCookieOptions, ADMIN_SESSION_COOKIE, createSessionToken } from "@/lib/adminAuth";
import { SessionConfigError } from "@/lib/signedToken";
import { verifyUserCredentials } from "@/lib/adminUsers";
import { getClientIp, readJsonBody, serverError, tooManyRequests } from "@/lib/http";
import { MAX_PASSWORD_LENGTH } from "@/lib/passwords";

export const runtime = "nodejs";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const ipLimit = await checkRateLimit(`admin-login:${ip}`, LOGIN_IP_POLICY);
  if (!ipLimit.success) {
    return tooManyRequests("Too many attempts. Please try again later.", ipLimit.retryAfterSeconds);
  }

  const read = await readJsonBody(request, 4 * 1024);
  if (!read.ok) return read.response;

  const parsed = loginSchema.safeParse(read.body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Username and password are required." },
      { status: 400 }
    );
  }
  const { username, password } = parsed.data;

  // Also throttle per account so guesses spread across many IPs still add up.
  const accountLimit = await checkRateLimit(
    `admin-login-user:${username.toLowerCase()}`,
    LOGIN_ACCOUNT_POLICY
  );
  if (!accountLimit.success) {
    return tooManyRequests(
      "Too many attempts. Please try again later.",
      accountLimit.retryAfterSeconds
    );
  }

  try {
    const verifiedUsername = await verifyUserCredentials(username, password);
    if (!verifiedUsername) {
      return NextResponse.json(
        { success: false, error: "Incorrect username or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createSessionToken(verifiedUsername),
      adminCookieOptions()
    );
    return response;
  } catch (error) {
    if (error instanceof SessionConfigError) {
      // Already logged loudly with the variable name; never tell the caller which one.
      return NextResponse.json(
        { success: false, error: "Sign-in is temporarily unavailable." },
        { status: 503 }
      );
    }
    console.error("[api/admin/login] failed:", error instanceof Error ? error.message : error);
    return serverError();
  }
}
