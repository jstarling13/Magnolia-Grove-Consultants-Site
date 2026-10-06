// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeSubmissionsDb } from "./helpers/fakeSubmissionsDb";

const state = vi.hoisted(() => ({ sql: undefined as unknown as (...a: unknown[]) => unknown }));
vi.mock("@/lib/db", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => state.sql(strings, ...values),
}));

import { createSessionToken } from "@/lib/adminAuth";
import {
  getVerifiedAdminSession,
  isAdminSessionRevoked,
  revokeAdminSessions,
} from "@/lib/adminSessions";

let db: FakeSubmissionsDb;
let now: number;

beforeEach(() => {
  now = Date.parse("2026-10-06T12:00:00Z");
  db = new FakeSubmissionsDb(() => now);
  state.sql = db.sql as never;
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-strong-random-secret-of-more-than-32-chars!!");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const tick = (ms: number) => {
  now += ms;
  vi.setSystemTime(now);
};

describe("admin session revocation", () => {
  it("accepts a fresh session when nothing has been revoked", async () => {
    const session = await getVerifiedAdminSession(createSessionToken("Bgarcia"));
    expect(session?.username).toBe("Bgarcia");
  });

  it("rejects missing, garbage and forged tokens without touching the database", async () => {
    expect(await getVerifiedAdminSession(undefined)).toBeNull();
    expect(await getVerifiedAdminSession("nope")).toBeNull();
    expect(db.queries).toHaveLength(0);
  });

  it("revoking a user kills the sessions issued before it, and only those", async () => {
    const old = createSessionToken("Bgarcia");
    const other = createSessionToken("Ntillotson");
    tick(1000);
    await revokeAdminSessions("Bgarcia");
    tick(1000);
    const fresh = createSessionToken("Bgarcia"); // signing in again after sign-out

    expect(await getVerifiedAdminSession(old)).toBeNull();
    expect((await getVerifiedAdminSession(fresh))?.username).toBe("Bgarcia");
    expect((await getVerifiedAdminSession(other))?.username).toBe("Ntillotson");
  });

  it("matches usernames case-insensitively, like login", async () => {
    const token = createSessionToken("BGarcia");
    tick(10);
    await revokeAdminSessions("bgarcia");
    expect(await getVerifiedAdminSession(token)).toBeNull();
  });

  it("a session issued in the same millisecond as the revocation survives (a login right after sign-out)", async () => {
    await revokeAdminSessions("Bgarcia");
    expect(await getVerifiedAdminSession(createSessionToken("Bgarcia"))).not.toBeNull();
  });

  it("a later revocation never moves valid-after backwards", async () => {
    await revokeAdminSessions("Bgarcia", now + 5000);
    await revokeAdminSessions("Bgarcia", now + 1000);
    expect(db.revocations.get("bgarcia")).toBe(now + 5000);
  });

  it("tokens that predate revocation (no issue time) are rejected once the user has a revocation", async () => {
    expect(
      await isAdminSessionRevoked({ username: "Bgarcia", issuedAt: 0 }),
      "no row yet: legacy tokens keep working until they expire"
    ).toBe(false);
    await revokeAdminSessions("Bgarcia");
    expect(await isAdminSessionRevoked({ username: "Bgarcia", issuedAt: 0 })).toBe(true);
  });

  it("fails closed when the revocation lookup cannot run", async () => {
    db.failNext(/admin_session_revocations/, new Error("db down"), 5);
    expect(await getVerifiedAdminSession(createSessionToken("Bgarcia"))).toBeNull();
  });

  it("retries creating its table after a failure instead of caching the error", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/adminSessions");
    db.failNext(/CREATE TABLE/, new Error("db down"));
    await expect(fresh.revokeAdminSessions("Bgarcia")).rejects.toThrow("db down");
    await expect(fresh.revokeAdminSessions("Bgarcia")).resolves.toBeUndefined();
  });
});
