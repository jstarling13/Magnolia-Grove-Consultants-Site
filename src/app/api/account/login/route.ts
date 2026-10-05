import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";
import { LOGIN_ACCOUNT_POLICY, LOGIN_IP_POLICY } from "@/lib/rateLimitPolicies";
import {
  CLIENT_SESSION_COOKIE,
  clientCookieOptions,
  createClientSessionToken,
} from "@/lib/clientAuth";
import { SessionConfigError } from "@/lib/signedToken";
import { verifyClientCredentials } from "@/lib/clientUsers";
import { emailKey, getClientIp, readJsonBody, serverError, tooManyRequests } from "@/lib/http";
import { MAX_PASSWORD_LENGTH } from "@/lib/passwords";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const ipLimit = await checkRateLimit(`account-login:${ip}`, LOGIN_IP_POLICY);
  if (!ipLimit.success) {
    return tooManyRequests("Too many attempts. Please try again later.", ipLimit.retryAfterSeconds);
  }

  const read = await readJsonBody(request, 4 * 1024);
  if (!read.ok) return read.response;

  const parsed = loginSchema.safeParse(read.body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Email and password are required." },
      { status: 400 }
    );
  }
  const { email, password } = parsed.data;

  const accountLimit = await checkRateLimit(
    `account-login-user:${emailKey(email)}`,
    LOGIN_ACCOUNT_POLICY
  );
  if (!accountLimit.success) {
    return tooManyRequests(
      "Too many attempts. Please try again later.",
      accountLimit.retryAfterSeconds
    );
  }

  try {
    const verifiedEmail = await verifyClientCredentials(email, password);
    if (!verifiedEmail) {
      return NextResponse.json(
        { success: false, error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      CLIENT_SESSION_COOKIE,
      createClientSessionToken(verifiedEmail),
      clientCookieOptions()
    );
    return response;
  } catch (error) {
    if (error instanceof SessionConfigError) {
      return NextResponse.json(
        { success: false, error: "Sign-in is temporarily unavailable." },
        { status: 503 }
      );
    }
    console.error("[api/account/login] failed:", error instanceof Error ? error.message : error);
    return serverError();
  }
}
