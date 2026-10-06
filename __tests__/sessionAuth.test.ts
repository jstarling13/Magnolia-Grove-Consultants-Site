// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import {
  ADMIN_SESSION_TTL_MS,
  adminCookieOptions,
  createSessionToken,
  verifyMigratePassword,
  verifySessionToken,
} from "@/lib/adminAuth";
import {
  CLIENT_SESSION_TTL_MS,
  clientCookieOptions,
  createClientSessionToken,
  verifyClientSessionToken,
} from "@/lib/clientAuth";
import {
  __resetSessionWarningsForTests,
  SessionConfigError,
  createSignedToken,
} from "@/lib/signedToken";
import { hashPassword, verifyAgainstDecoy, verifyPasswordHash } from "@/lib/passwords";

const STRONG = "a-strong-random-secret-of-more-than-32-chars!!";

beforeEach(() => {
  __resetSessionWarningsForTests();
  vi.stubEnv("ADMIN_SESSION_SECRET", STRONG);
  vi.stubEnv("CLIENT_SESSION_SECRET", STRONG + "-client");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("admin session tokens", () => {
  it("round-trips the username and the issue time", () => {
    const before = Date.now();
    const session = verifySessionToken(createSessionToken("Bgarcia"));
    expect(session?.username).toBe("Bgarcia");
    expect(session?.issuedAt).toBeGreaterThanOrEqual(before);
    expect(session?.issuedAt).toBeLessThanOrEqual(Date.now());
  });

  it("treats a token without an issue time as issued at 0 (predates revocation)", () => {
    const encoded = Buffer.from(
      JSON.stringify({ username: "Bgarcia", exp: Date.now() + 1e6 })
    ).toString("base64url");
    const sig = createHmac("sha256", process.env.ADMIN_SESSION_SECRET!)
      .update(encoded)
      .digest("base64url");
    expect(verifySessionToken(`${encoded}.${sig}`)).toEqual({ username: "Bgarcia", issuedAt: 0 });
  });

  it("rejects a tampered payload and a tampered signature", () => {
    const [payload, sig] = createSessionToken("Bgarcia").split(".");
    const forged = Buffer.from(
      JSON.stringify({ username: "Bgarcia", exp: Date.now() + 1e9 })
    ).toString("base64url");
    expect(verifySessionToken(`${forged}.${sig}`)).toBeNull();
    expect(verifySessionToken(`${payload}.${sig.slice(0, -2)}xx`)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const token = createSessionToken("Bgarcia");
    vi.stubEnv("ADMIN_SESSION_SECRET", "a-different-secret-that-is-long-enough-123");
    expect(verifySessionToken(token)).toBeNull();
  });

  it("expires after the TTL", () => {
    vi.useFakeTimers();
    const token = createSessionToken("Bgarcia");
    vi.advanceTimersByTime(ADMIN_SESSION_TTL_MS - 1000);
    expect(verifySessionToken(token)).not.toBeNull();
    vi.advanceTimersByTime(2000);
    expect(verifySessionToken(token)).toBeNull();
  });

  it("is not accepted as a client session and vice versa", () => {
    expect(verifyClientSessionToken(createSessionToken("Bgarcia"))).toBeNull();
    expect(verifySessionToken(createClientSessionToken("a@example.com"))).toBeNull();
  });

  it("rejects a validly signed token without the username claim", () => {
    const token = createSignedToken("ADMIN_SESSION_SECRET", { email: "a@example.com" }, 60_000);
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects junk, extra segments, and oversized tokens without throwing", () => {
    const good = createSessionToken("Bgarcia");
    for (const bad of ["", "abc", "a.b.c", `${good}.extra`, "x".repeat(5000), undefined]) {
      expect(verifySessionToken(bad)).toBeNull();
    }
  });
});

describe("missing or weak secrets fail closed", () => {
  it("verify returns null (never throws) when the secret is unset, and logs the variable name", () => {
    const token = createSessionToken("Bgarcia");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(verifySessionToken(token)).toBeNull();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(String((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain(
      "ADMIN_SESSION_SECRET"
    );
  });

  it("an attacker cannot forge a token with the empty key when the secret is unset", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    const payload = Buffer.from(
      JSON.stringify({ username: "Bgarcia", exp: Date.now() + 1e9 })
    ).toString("base64url");
    const sig = createHmac("sha256", "").update(payload).digest("base64url");
    expect(verifySessionToken(`${payload}.${sig}`)).toBeNull();
  });

  it("create throws SessionConfigError for a missing or too-short secret", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(() => createSessionToken("x")).toThrow(SessionConfigError);
    vi.stubEnv("CLIENT_SESSION_SECRET", "short");
    expect(() => createClientSessionToken("a@example.com")).toThrow(SessionConfigError);
  });

  it("a 16-31 character secret still works but warns about its length", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "exactly-20-chars-ok");
    expect(verifySessionToken(createSessionToken("Bgarcia"))).not.toBeNull();
    expect(String((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain(
      "recommended"
    );
  });
});

describe("cookie options", () => {
  it("are httpOnly, path /, and secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(adminCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_TTL_MS / 1000,
    });
    expect(clientCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: CLIENT_SESSION_TTL_MS / 1000,
    });
  });

  it("are not secure outside production so plain-http localhost can sign in", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(adminCookieOptions().secure).toBe(false);
  });

  it("keep sessions to sensible lifetimes", () => {
    expect(ADMIN_SESSION_TTL_MS).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    expect(CLIENT_SESSION_TTL_MS).toBeLessThanOrEqual(14 * 24 * 60 * 60 * 1000);
  });
});

describe("verifyMigratePassword", () => {
  it("accepts only the exact configured password", () => {
    vi.stubEnv("ADMIN_PASSWORD", "correct horse battery staple");
    expect(verifyMigratePassword("correct horse battery staple")).toBe(true);
    expect(verifyMigratePassword("correct horse battery stapl")).toBe(false);
    expect(verifyMigratePassword("")).toBe(false);
  });

  it("is disabled entirely when ADMIN_PASSWORD is unset or empty (empty candidate must not match)", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(verifyMigratePassword("")).toBe(false);
    expect(verifyMigratePassword("anything")).toBe(false);
    vi.stubEnv("ADMIN_PASSWORD", undefined as unknown as string);
    expect(verifyMigratePassword("")).toBe(false);
  });
});

describe("passwords", () => {
  it("hash and verify round-trip", () => {
    const stored = hashPassword("hunter2hunter2");
    expect(verifyPasswordHash("hunter2hunter2", stored)).toBe(true);
    expect(verifyPasswordHash("wrong", stored)).toBe(false);
  });

  it("the decoy check always returns false but does the same work as a real check", () => {
    expect(verifyAgainstDecoy("anything")).toBe(false);
    const stored = hashPassword("x".repeat(20));
    const time = (fn: () => void) => {
      const start = process.hrtime.bigint();
      fn();
      return Number(process.hrtime.bigint() - start) / 1e6;
    };
    verifyAgainstDecoy("warm");
    const decoy = Math.min(...Array.from({ length: 3 }, () => time(() => verifyAgainstDecoy("p"))));
    const real = Math.min(
      ...Array.from({ length: 3 }, () => time(() => verifyPasswordHash("p", stored)))
    );
    // Same order of magnitude (scrypt dominates); an early return would be ~0ms.
    expect(decoy).toBeGreaterThan(real / 4);
  });
});
