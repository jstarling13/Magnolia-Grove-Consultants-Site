import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminCookieOptions } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Expire with the same attributes the cookie was set with.
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return response;
}
