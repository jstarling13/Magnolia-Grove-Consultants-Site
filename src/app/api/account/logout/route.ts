import { NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE } from "@/lib/clientAuth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(CLIENT_SESSION_COOKIE);
  return response;
}
