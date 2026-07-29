import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { CLIENT_SESSION_COOKIE, verifyClientSessionToken } from "@/lib/clientAuth";

export const config = {
  runtime: "nodejs",
  matcher: ["/admin/:path*", "/account/:path*"],
};

const PUBLIC_ACCOUNT_PATHS = new Set(["/account/login", "/account/signup"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!verifySessionToken(token)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    if (PUBLIC_ACCOUNT_PATHS.has(pathname)) {
      return NextResponse.next();
    }
    const token = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
    if (!verifyClientSessionToken(token)) {
      return NextResponse.redirect(new URL("/account/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}
