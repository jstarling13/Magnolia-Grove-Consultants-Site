import { NextResponse, type NextRequest } from "next/server";
import { parseOrderRefParam, verifyOrderToken } from "./orderTracking";

/**
 * Answers a request for /orders/... : a real 404 (the site's normal not-found
 * page) unless the path is /orders/<ref> with a token that signs that ref.
 * Every failure looks the same, so it never reveals whether an order exists.
 * Valid requests continue to the page, marked noindex and uncacheable.
 */
export function gateOrderRequest(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;
  const segment = /^\/orders\/([^/]+)\/?$/.exec(pathname)?.[1];
  const id = segment === undefined ? undefined : parseOrderRefParam(segment);
  const tokens = searchParams.getAll("t");
  const allowed = id !== undefined && tokens.length === 1 && verifyOrderToken(id, tokens[0]);

  const response = allowed
    ? NextResponse.next()
    : NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
