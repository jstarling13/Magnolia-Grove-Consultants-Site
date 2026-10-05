// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upstash = vi.hoisted(() => ({ limit: vi.fn(), constructed: [] as unknown[] }));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow(limit: number, window: string) {
      return { limit, window };
    }
    constructor(options: unknown) {
      upstash.constructed.push(options);
    }
    limit = upstash.limit;
  },
}));

import { __resetRateLimitForTests, checkRateLimit } from "@/lib/ratelimit";

const POLICY = { name: "t", limit: 2, windowSeconds: 60 };

beforeEach(() => {
  __resetRateLimitForTests();
  upstash.limit.mockReset();
  upstash.constructed.length = 0;
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("without Upstash configured", () => {
  it("allows everything outside production, with a warning logged once", async () => {
    vi.stubEnv("NODE_ENV", "development");
    for (let i = 0; i < 20; i++) expect((await checkRateLimit("ip", POLICY)).success).toBe(true);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("in production logs a loud error once, does not crash, and still limits per instance", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await checkRateLimit("ip", POLICY)).success).toBe(true);
    expect((await checkRateLimit("ip", POLICY)).success).toBe(true);
    const blocked = await checkRateLimit("ip", POLICY);
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(String((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain(
      "CRITICAL"
    );
  });

  it("counts identifiers and policies independently", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await checkRateLimit("a", POLICY);
    await checkRateLimit("a", POLICY);
    expect((await checkRateLimit("a", POLICY)).success).toBe(false);
    expect((await checkRateLimit("b", POLICY)).success).toBe(true);
    expect((await checkRateLimit("a", { ...POLICY, name: "other" })).success).toBe(true);
  });
});

describe("with Upstash configured", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "mock-token");
  });

  it("uses one limiter per policy with its own key prefix", async () => {
    upstash.limit.mockResolvedValue({ success: true, limit: 2, remaining: 1, reset: Date.now() });
    await checkRateLimit("ip", POLICY);
    await checkRateLimit("ip2", POLICY);
    await checkRateLimit("ip", { ...POLICY, name: "second" });
    expect(upstash.constructed).toHaveLength(2);
    expect((upstash.constructed[0] as { prefix: string }).prefix).toBe("magnolia-grove:t");
  });

  it("reports retryAfterSeconds when blocked", async () => {
    upstash.limit.mockResolvedValue({
      success: false,
      limit: 2,
      remaining: 0,
      reset: Date.now() + 30_000,
    });
    const result = await checkRateLimit("ip", POLICY);
    expect(result.success).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(29);
  });

  it("on a backend error: failClosed policies refuse, others allow, neither throws", async () => {
    upstash.limit.mockRejectedValue(new Error("redis down"));
    expect((await checkRateLimit("ip", { ...POLICY, failClosed: true })).success).toBe(false);
    expect((await checkRateLimit("ip", POLICY)).success).toBe(true);
  });
});
