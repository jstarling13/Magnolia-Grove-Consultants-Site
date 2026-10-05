import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { CLIENT_SESSION_COOKIE, verifyClientSessionToken } from "@/lib/clientAuth";
import { gateOrderRequest } from "@/lib/orderTrackingGate";

export const config = {
  runtime: "nodejs",
  matcher: ["/admin/:path*", "/account/:path*", "/orders", "/orders/:path*"],
};

const PUBLIC_ACCOUNT_PATHS = new Set(["/account/login", "/account/signup"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Token-gated order status pages: bad links get a real 404 here, before the
  // page renders (the root loading.tsx would make a page-level notFound a 200).
  if (pathname === "/orders" || pathname.startsWith("/orders/")) {
    return gateOrderRequest(request);
  }

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
