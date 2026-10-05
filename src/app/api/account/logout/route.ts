import { NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE, clientCookieOptions } from "@/lib/clientAuth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(CLIENT_SESSION_COOKIE, "", { ...clientCookieOptions(), maxAge: 0 });
  return response;
}
