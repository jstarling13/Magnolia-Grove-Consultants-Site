import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { middleware, config } from "@/middleware";
import { createOrderToken } from "@/lib/orderTracking";

const SECRET = "test-secret-with-enough-length-0123456789";

function run(path: string) {
  return middleware(new NextRequest(`https://shop.example.com${path}`));
}

/** NextResponse.next() marks pass-through; rewrite carries the rewrite target. */
function isPassThrough(response: Response) {
  return response.headers.get("x-middleware-next") === "1";
}
function isNotFound(response: Response) {
  return response.status === 404 && response.headers.get("x-middleware-rewrite") !== null;
}

describe("order status middleware", () => {
  beforeEach(() => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("only runs for /orders paths", () => {
    expect(config.matcher).toEqual(expect.arrayContaining(["/orders", "/orders/:path*"]));
  });

  it("still guards admin and account paths", () => {
    expect(config.matcher).toEqual(expect.arrayContaining(["/admin/:path*", "/account/:path*"]));
    const admin = run("/admin");
    expect(admin.status).toBe(307);
    expect(admin.headers.get("location")).toContain("/admin/login");
    const account = run("/account");
    expect(account.headers.get("location")).toContain("/account/login");
  });

  it("lets a valid link through, marked uncacheable and noindex", () => {
    const response = run(`/orders/MG-00042?t=${createOrderToken(42)}`);
    expect(isPassThrough(response)).toBe(true);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("accepts lowercase, padded, and trailing-slash refs", () => {
    const t = createOrderToken(42);
    for (const path of [
      `/orders/mg-00042?t=${t}`,
      `/orders/%20MG-42%20?t=${t}`,
      `/orders/MG-00042/?t=${t}`,
    ]) {
      expect(isPassThrough(run(path))).toBe(true);
    }
  });

  it.each([
    ["no token", "/orders/MG-00042"],
    ["empty token", "/orders/MG-00042?t="],
    ["wrong token", "/orders/MG-00042?t=nope"],
    ["malformed ref", "/orders/garbage?t=x"],
    ["huge ref", "/orders/MG-99999999999999999999?t=x"],
    ["the bare /orders path", "/orders"],
    ["a nested path", "/orders/MG-00042/extra"],
  ])("answers a real 404 for %s", (_label, path) => {
    const response = run(path);
    expect(isNotFound(response)).toBe(true);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("answers 404 for another order's token and for repeated token params", () => {
    expect(isNotFound(run(`/orders/MG-00042?t=${createOrderToken(43)}`))).toBe(true);
    const t = createOrderToken(42);
    expect(isNotFound(run(`/orders/MG-00042?t=${t}&t=${t}`))).toBe(true);
  });

  it("answers 404 for everything when ORDER_LINK_SECRET is unset", () => {
    const t = createOrderToken(42);
    vi.stubEnv("ORDER_LINK_SECRET", "");
    expect(isNotFound(run(`/orders/MG-00042?t=${t}`))).toBe(true);
  });
});
