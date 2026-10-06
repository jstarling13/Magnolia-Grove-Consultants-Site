import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminCookieOptions, verifySessionToken } from "@/lib/adminAuth";
import { revokeAdminSessions } from "@/lib/adminSessions";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Signing out revokes server-side every session this admin has issued (not just
  // this browser's), so a copied cookie stops working immediately. Only a validly
  // signed token can trigger it, so nobody can sign another admin out.
  const session = verifySessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (session) {
    try {
      await revokeAdminSessions(session.username);
    } catch (error) {
      // Still clear the cookie; the 24h token expiry is the fallback.
      console.error(
        "[api/admin/logout] revocation failed:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const response = NextResponse.json({ success: true });
  // Expire with the same attributes the cookie was set with.
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return response;
}
