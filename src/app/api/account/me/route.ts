import { NextRequest, NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE, verifyClientSessionToken } from "@/lib/clientAuth";
import { getClientProfile } from "@/lib/clientUsers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = verifyClientSessionToken(request.cookies.get(CLIENT_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }

  const profile = await getClientProfile(session.email);
  return NextResponse.json({ profile });
}
