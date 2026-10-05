// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware, config } from "@/middleware";
import { createSessionToken } from "@/lib/adminAuth";
import { createClientSessionToken } from "@/lib/clientAuth";

const SECRET = "a-strong-random-secret-of-more-than-32-chars!!";

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", SECRET);
  vi.stubEnv("CLIENT_SESSION_SECRET", SECRET + "-client");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function req(path: string, cookie?: string) {
  return new NextRequest(`https://example.test${path}`, {
    headers: cookie ? { cookie } : {},
  });
}
const admin = () => `admin_session=${createSessionToken("Bgarcia")}`;
const client = () => `client_session=${createClientSessionToken("pat@example.com")}`;

function redirectsTo(res: Response, path: string) {
  expect(res.status).toBe(307);
  expect(new URL(res.headers.get("location")!).pathname).toBe(path);
}
function passes(res: Response) {
  expect(res.headers.get("x-middleware-next")).toBe("1");
  expect(res.headers.get("location")).toBeNull();
}

describe("matcher coverage", () => {
  it("covers every page under /admin (incl. /admin/orders), /account, and the token-gated /orders pages, nothing else", () => {
    expect(config.matcher).toEqual([
      "/admin/:path*",
      "/account/:path*",
      "/orders",
      "/orders/:path*",
    ]);
  });

  it("never sends /orders tracking visitors to a login page (they carry their own per-order token)", () => {
    for (const path of ["/orders/MG-00042", "/orders"]) {
      const location = middleware(req(path)).headers.get("location") ?? "";
      expect(location).not.toContain("/login");
    }
  });
});

describe("/admin", () => {
  it.each([
    "/admin",
    "/admin/orders",
    "/admin/orders/42",
    "/admin/orders/",
    "/admin/anything/deep",
  ])("redirects %s to the login page without a session", (path) => {
    redirectsTo(middleware(req(path)), "/admin/login");
  });

  it.each(["/admin", "/admin/orders", "/admin/orders/42"])(
    "lets %s through with a valid session",
    (path) => {
      passes(middleware(req(path, admin())));
    }
  );

  it("serves the login page (and its trailing-slash form) without a session", () => {
    passes(middleware(req("/admin/login")));
    passes(middleware(req("/admin/login/")));
  });

  it("rejects a client session cookie, a forged cookie, and a tampered token", () => {
    redirectsTo(
      middleware(req("/admin", client().replace("client_session", "admin_session"))),
      "/admin/login"
    );
    redirectsTo(middleware(req("/admin", "admin_session=forged.value")), "/admin/login");
    const [p, s] = createSessionToken("Bgarcia").split(".");
    redirectsTo(middleware(req("/admin", `admin_session=${p}x.${s}`)), "/admin/login");
  });

  it("redirects (does not throw or 500) when the session secret is missing", () => {
    const cookie = admin();
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    redirectsTo(middleware(req("/admin/orders", cookie)), "/admin/login");
  });

  it("marks signed-in pages private and noindex", () => {
    const res = middleware(req("/admin", admin()));
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });
});

describe("/account", () => {
  it("redirects to login without a session; the admin cookie is not a client session", () => {
    redirectsTo(middleware(req("/account")), "/account/login");
    redirectsTo(middleware(req("/account/orders")), "/account/login");
    redirectsTo(
      middleware(req("/account", admin().replace("admin_session", "client_session"))),
      "/account/login"
    );
  });

  it("lets signed-in clients through and leaves login/signup public", () => {
    passes(middleware(req("/account", client())));
    passes(middleware(req("/account/login")));
    passes(middleware(req("/account/signup/")));
  });

  it("does not treat nested paths under the public pages as public", () => {
    redirectsTo(middleware(req("/account/login/anything")), "/account/login");
  });
});
