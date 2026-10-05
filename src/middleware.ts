import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { CLIENT_SESSION_COOKIE, verifyClientSessionToken } from "@/lib/clientAuth";

// Covers every page under /admin (including /admin/orders) and /account.
// Deliberately NOT matched: /api/* (each route authenticates itself),
// /orders/* (customer tracking pages that carry their own unguessable
// per-order token, no login), and the public site.
export const config = {
  runtime: "nodejs",
  matcher: ["/admin/:path*", "/account/:path*"],
};

const PUBLIC_ACCOUNT_PATHS = new Set(["/account/login", "/account/signup"]);

/** Signed-in pages must never be stored by a shared cache or indexed. */
function privatePage(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function middleware(request: NextRequest) {
  // "/admin/login/" and "/admin/login" are the same page.
  const pathname =
    request.nextUrl.pathname.length > 1
      ? request.nextUrl.pathname.replace(/\/+$/, "")
      : request.nextUrl.pathname;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") {
      return privatePage(NextResponse.next());
    }
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!verifySessionToken(token)) {
      return privatePage(NextResponse.redirect(new URL("/admin/login", request.url)));
    }
    return privatePage(NextResponse.next());
  }

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    if (PUBLIC_ACCOUNT_PATHS.has(pathname)) {
      return privatePage(NextResponse.next());
    }
    const token = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
    if (!verifyClientSessionToken(token)) {
      return privatePage(NextResponse.redirect(new URL("/account/login", request.url)));
    }
    return privatePage(NextResponse.next());
  }

  return NextResponse.next();
}
