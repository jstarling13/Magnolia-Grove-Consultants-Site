// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  verifyUserCredentials: vi.fn(),
  verifyClientCredentials: vi.fn(),
  createClientUser: vi.fn(),
  revokeAdminSessions: vi.fn(),
}));
vi.mock("@/lib/adminSessions", () => ({ revokeAdminSessions: mocks.revokeAdminSessions }));
vi.mock("@/lib/ratelimit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/adminUsers", () => ({ verifyUserCredentials: mocks.verifyUserCredentials }));
vi.mock("@/lib/clientUsers", () => ({
  verifyClientCredentials: mocks.verifyClientCredentials,
  createClientUser: mocks.createClientUser,
}));

import { POST as adminLogin } from "@/app/api/admin/login/route";
import { POST as adminLogout } from "@/app/api/admin/logout/route";
import { POST as accountLogin } from "@/app/api/account/login/route";
import { POST as accountSignup } from "@/app/api/account/signup/route";
import { POST as accountLogout } from "@/app/api/account/logout/route";
import { createSessionToken, verifySessionToken } from "@/lib/adminAuth";
import { verifyClientSessionToken } from "@/lib/clientAuth";

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

const SECRET = "a-strong-random-secret-of-more-than-32-chars!!";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockResolvedValue({ success: true });
  vi.stubEnv("ADMIN_SESSION_SECRET", SECRET);
  vi.stubEnv("CLIENT_SESSION_SECRET", SECRET + "-client");
  vi.stubEnv("NODE_ENV", "production");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function cookieOf(res: Response, name: string) {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`)) ?? "";
}

describe("POST /api/admin/login", () => {
  it("sets a strict, httpOnly, secure cookie holding a valid session on success", async () => {
    mocks.verifyUserCredentials.mockResolvedValue("Bgarcia");
    const res = await adminLogin(post("/api/admin/login", { username: "Bgarcia", password: "pw" }));
    expect(res.status).toBe(200);
    const cookie = cookieOf(res, "admin_session");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=strict/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=86400/);
    const token = cookie.split(";")[0].split("=")[1];
    expect(verifySessionToken(token)).toMatchObject({ username: "Bgarcia" });
  });

  it("answers 401 with a generic message and no cookie for bad credentials", async () => {
    mocks.verifyUserCredentials.mockResolvedValue(null);
    const res = await adminLogin(post("/api/admin/login", { username: "x", password: "y" }));
    expect(res.status).toBe(401);
    expect(cookieOf(res, "admin_session")).toBe("");
    expect(await res.json()).toEqual({ success: false, error: "Incorrect username or password." });
  });

  it("throttles per IP and per account (429 + Retry-After) before touching the database", async () => {
    mocks.checkRateLimit.mockResolvedValueOnce({ success: false, retryAfterSeconds: 120 });
    let res = await adminLogin(post("/api/admin/login", { username: "a", password: "b" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");

    mocks.checkRateLimit
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false });
    res = await adminLogin(post("/api/admin/login", { username: "a", password: "b" }));
    expect(res.status).toBe(429);
    expect(mocks.verifyUserCredentials).not.toHaveBeenCalled();
    // The account bucket is keyed by lower-cased username.
    expect(mocks.checkRateLimit.mock.calls[2][0]).toBe("admin-login-user:a");
  });

  it("is 503 (not a crash, not a forgeable cookie) when the session secret is missing", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    mocks.verifyUserCredentials.mockResolvedValue("Bgarcia");
    const res = await adminLogin(post("/api/admin/login", { username: "Bgarcia", password: "pw" }));
    expect(res.status).toBe(503);
    expect(cookieOf(res, "admin_session")).toBe("");
    expect(JSON.stringify(await res.json())).not.toMatch(/SECRET/);
  });

  it("returns a generic 500 without internals when the database throws", async () => {
    mocks.verifyUserCredentials.mockRejectedValue(new Error("connection to 10.0.0.5:5432 refused"));
    const res = await adminLogin(post("/api/admin/login", { username: "a", password: "b" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.5");
  });

  it.each([
    ["not json", "{oops"],
    ["wrong types", { username: 5, password: ["x"] }],
    ["missing password", { username: "a" }],
    ["huge password", { username: "a", password: "x".repeat(500) }],
  ])("rejects malformed input (%s) with 400 and never queries the database", async (_n, body) => {
    const res = await adminLogin(post("/api/admin/login", body as string));
    expect(res.status).toBe(400);
    expect(mocks.verifyUserCredentials).not.toHaveBeenCalled();
  });

  it("rejects an oversized body with 413", async () => {
    const res = await adminLogin(
      post("/api/admin/login", { username: "a", password: "b", pad: "x".repeat(10_000) })
    );
    expect(res.status).toBe(413);
  });
});

describe("POST /api/account/login", () => {
  it("sets a lax, httpOnly, secure cookie on success", async () => {
    mocks.verifyClientCredentials.mockResolvedValue("pat@example.com");
    const res = await accountLogin(
      post("/api/account/login", { email: "pat@example.com", password: "pw" })
    );
    expect(res.status).toBe(200);
    const cookie = cookieOf(res, "client_session");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(verifyClientSessionToken(cookie.split(";")[0].split("=")[1])).toEqual({
      email: "pat@example.com",
    });
  });

  it("401 for bad credentials, 429 when throttled, 503 without the secret", async () => {
    mocks.verifyClientCredentials.mockResolvedValue(null);
    expect(
      (await accountLogin(post("/api/account/login", { email: "a@b.co", password: "x" }))).status
    ).toBe(401);

    mocks.checkRateLimit.mockResolvedValueOnce({ success: false });
    expect(
      (await accountLogin(post("/api/account/login", { email: "a@b.co", password: "x" }))).status
    ).toBe(429);

    vi.stubEnv("CLIENT_SESSION_SECRET", "");
    mocks.verifyClientCredentials.mockResolvedValue("a@b.co");
    expect(
      (await accountLogin(post("/api/account/login", { email: "a@b.co", password: "x" }))).status
    ).toBe(503);
  });
});

describe("POST /api/account/signup", () => {
  const valid = {
    email: "pat@example.com",
    password: "longenough1",
    firstName: "Pat",
    lastName: "Lee",
  };

  it("creates the account and a session", async () => {
    mocks.createClientUser.mockResolvedValue({ ok: true });
    const res = await accountSignup(post("/api/account/signup", valid));
    expect(res.status).toBe(200);
    expect(cookieOf(res, "client_session")).toMatch(/HttpOnly/i);
  });

  it("409 for a duplicate email", async () => {
    mocks.createClientUser.mockResolvedValue({ ok: false, reason: "email_taken" });
    expect((await accountSignup(post("/api/account/signup", valid))).status).toBe(409);
  });

  it.each([
    ["bad email", { ...valid, email: "nope" }],
    ["short password", { ...valid, password: "short" }],
    ["very long password", { ...valid, password: "x".repeat(200) }],
    ["missing name", { ...valid, firstName: "  " }],
    ["non-string fields", { ...valid, lastName: { $ne: 1 } }],
    ["overlong org", { ...valid, orgName: "o".repeat(500) }],
  ])("400 for %s without creating anything", async (_n, body) => {
    const res = await accountSignup(post("/api/account/signup", body));
    expect(res.status).toBe(400);
    expect(mocks.createClientUser).not.toHaveBeenCalled();
  });

  it("does not create an account when sessions are not configured", async () => {
    vi.stubEnv("CLIENT_SESSION_SECRET", "");
    const res = await accountSignup(post("/api/account/signup", valid));
    expect(res.status).toBe(503);
    expect(mocks.createClientUser).not.toHaveBeenCalled();
  });

  it("a database failure (e.g. duplicate-email race) is a generic 500", async () => {
    mocks.createClientUser.mockRejectedValue(
      new Error('duplicate key value violates "client_users_email_key"')
    );
    const res = await accountSignup(post("/api/account/signup", valid));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("client_users_email_key");
  });
});

describe("admin logout revocation", () => {
  const withCookie = (value: string) =>
    post("/api/admin/logout", {}, { cookie: `admin_session=${value}` });

  it("revokes the signed-in admin's sessions server-side and still clears the cookie", async () => {
    const res = await adminLogout(withCookie(createSessionToken("Bgarcia")));
    expect(res.status).toBe(200);
    expect(mocks.revokeAdminSessions).toHaveBeenCalledExactlyOnceWith("Bgarcia");
    expect(cookieOf(res, "admin_session")).toMatch(/Max-Age=0/);
  });

  it("does not revoke anything for a missing, forged or expired token", async () => {
    await adminLogout(post("/api/admin/logout", {}));
    await adminLogout(withCookie(createSessionToken("Bgarcia").replace(/.$/, "x")));
    const forged = Buffer.from(
      JSON.stringify({ username: "Ntillotson", exp: Date.now() + 1e9 })
    ).toString("base64url");
    await adminLogout(withCookie(`${forged}.bogus`));
    expect(mocks.revokeAdminSessions).not.toHaveBeenCalled();
  });

  it("still signs out (cookie cleared, 200) when the revocation write fails", async () => {
    mocks.revokeAdminSessions.mockRejectedValue(new Error("db down"));
    const res = await adminLogout(withCookie(createSessionToken("Bgarcia")));
    expect(res.status).toBe(200);
    expect(cookieOf(res, "admin_session")).toMatch(/Max-Age=0/);
  });
});

describe("logout", () => {
  it("expires the cookie with the same attributes it was set with", async () => {
    const admin = cookieOf(await adminLogout(post("/api/admin/logout", {})), "admin_session");
    expect(admin).toMatch(/Max-Age=0/);
    expect(admin).toMatch(/SameSite=strict/i);
    expect(admin).toMatch(/Secure/i);
    const client = cookieOf(await accountLogout(), "client_session");
    expect(client).toMatch(/Max-Age=0/);
    expect(client).toMatch(/SameSite=lax/i);
  });
});
