// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  queries: [] as string[],
  searchProducts: vi.fn(),
}));
vi.mock("@/lib/ratelimit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/db", () => ({
  sql: async (strings: TemplateStringsArray) => {
    mocks.queries.push(strings.join("?"));
    return [];
  },
}));
vi.mock("../src/lib/asi/client", () => ({
  searchProducts: mocks.searchProducts,
  getProduct: vi.fn(),
}));

import { POST as migrate } from "@/app/api/admin/migrate/route";
import { GET as search } from "@/app/api/merchant/products/route";

function post(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/migrate", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-real-ip": "9.9.9.9", ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queries.length = 0;
  mocks.checkRateLimit.mockResolvedValue({ success: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/admin/migrate", () => {
  it("runs with the right password", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "correct-migrate-password");
    const res = await migrate(post({ password: "correct-migrate-password" }));
    expect(res.status).toBe(200);
    expect(mocks.queries.length).toBeGreaterThan(0);
  });

  it("is closed when ADMIN_PASSWORD is unset: an empty or missing password never runs SQL", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    for (const body of [{ password: "" }, {}, { password: "x" }, "garbage"]) {
      const res = await migrate(post(body));
      expect(res.status).toBe(401);
    }
    expect(mocks.queries).toHaveLength(0);
  });

  it("401s a wrong password and throttles guessing", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "correct-migrate-password");
    expect((await migrate(post({ password: "nope" }))).status).toBe(401);
    mocks.checkRateLimit.mockResolvedValue({ success: false, retryAfterSeconds: 30 });
    const res = await migrate(post({ password: "correct-migrate-password" }));
    expect(res.status).toBe(429);
    expect(mocks.queries).toHaveLength(0);
    expect(mocks.checkRateLimit.mock.calls[0][0]).toBe("migrate:9.9.9.9");
  });

  it("refuses to reset admin passwords to something trivially short, before touching the database", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "correct-migrate-password");
    const res = await migrate(post({ password: "correct-migrate-password", resetPassword: "abc" }));
    expect(res.status).toBe(400);
    expect(mocks.queries).toHaveLength(0);
  });

  it("returns a generic message when the database fails", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "correct-migrate-password");
    const sqlModule = await import("@/lib/db");
    vi.spyOn(sqlModule, "sql").mockRejectedValue(
      new Error("password authentication failed for user neondb_owner")
    );
    const res = await migrate(post({ password: "correct-migrate-password" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("neondb_owner");
  });
});

describe("GET /api/merchant/products", () => {
  const get = (q: string) =>
    search(
      new NextRequest(`http://localhost/api/merchant/products?q=${q}`, {
        headers: { "x-real-ip": "9.9.9.9" },
      })
    );

  it("throttles the unauthenticated vendor-API proxy before calling the vendor", async () => {
    vi.stubEnv("ASI_SMARTLINK_CLIENT_ID", "id");
    vi.stubEnv("ASI_SMARTLINK_CLIENT_SECRET", "secret");
    mocks.checkRateLimit.mockResolvedValue({ success: false });
    expect((await get("pens")).status).toBe(429);
    expect(mocks.searchProducts).not.toHaveBeenCalled();
  });

  it("still validates input", async () => {
    expect((await get("")).status).toBe(400);
    expect((await get("x".repeat(101))).status).toBe(400);
  });
});
