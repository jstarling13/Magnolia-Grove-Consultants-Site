import { NextRequest, NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE, verifyClientSessionToken } from "@/lib/clientAuth";
import { getClientProfile } from "@/lib/clientUsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const session = verifyClientSessionToken(request.cookies.get(CLIENT_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ profile: null }, { status: 401, headers: NO_STORE });
  }

  try {
    const profile = await getClientProfile(session.email);
    return NextResponse.json({ profile }, { headers: NO_STORE });
  } catch (error) {
    console.error("[api/account/me] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ profile: null }, { status: 500, headers: NO_STORE });
  }
}
