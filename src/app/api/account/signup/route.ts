import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";
import { SIGNUP_POLICY } from "@/lib/rateLimitPolicies";
import {
  CLIENT_SESSION_COOKIE,
  clientCookieOptions,
  createClientSessionToken,
} from "@/lib/clientAuth";
import { SessionConfigError } from "@/lib/signedToken";
import { createClientUser } from "@/lib/clientUsers";
import { getClientIp, readJsonBody, serverError, tooManyRequests } from "@/lib/http";
import { MAX_PASSWORD_LENGTH } from "@/lib/passwords";

export const runtime = "nodejs";

const signupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`),
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  phone: z.string().trim().max(30).optional().default(""),
  orgName: z.string().trim().max(200).optional().default(""),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const limit = await checkRateLimit(`account-signup:${ip}`, SIGNUP_POLICY);
  if (!limit.success) {
    return tooManyRequests("Too many attempts. Please try again later.", limit.retryAfterSeconds);
  }

  const read = await readJsonBody(request, 8 * 1024);
  if (!read.ok) return read.response;

  const parsed = signupSchema.safeParse(read.body);
  if (!parsed.success) {
    // First message only: the client shows one error at a time.
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid sign-up details." },
      { status: 400 }
    );
  }
  const { email, password, firstName, lastName, phone, orgName } = parsed.data;

  try {
    // Mint the session first so a missing/weak secret fails before an account is created.
    const sessionToken = createClientSessionToken(email);
    const result = await createClientUser({ email, password, firstName, lastName, phone, orgName });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(CLIENT_SESSION_COOKIE, sessionToken, clientCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof SessionConfigError) {
      return NextResponse.json(
        { success: false, error: "Sign-in is temporarily unavailable." },
        { status: 503 }
      );
    }
    // Includes the unique-constraint race when two sign-ups use the same email at once.
    console.error("[api/account/signup] failed:", error instanceof Error ? error.message : error);
    return serverError();
  }
}
