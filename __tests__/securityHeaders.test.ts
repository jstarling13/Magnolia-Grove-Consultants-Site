// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadHeaders(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string);
  const config = (await import("../next.config.mjs")).default as {
    poweredByHeader?: boolean;
    headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
  };
  const rules = await config.headers();
  const map = Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
  return { rules, map, config };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("security headers", () => {
  it("applies to every path and sets the baseline headers", async () => {
    const { rules, map, config } = await loadHeaders({ NODE_ENV: "production" });
    expect(rules[0].source).toBe("/:path*");
    expect(map["X-Content-Type-Options"]).toBe("nosniff");
    expect(map["X-Frame-Options"]).toBe("DENY");
    expect(map["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(map["Permissions-Policy"]).toMatch(/camera=\(\)/);
    expect(map["Permissions-Policy"]).toMatch(/microphone=\(\)/);
    expect(map["Permissions-Policy"]).toMatch(/geolocation=\(\)/);
    expect(config.poweredByHeader).toBe(false);
  });

  it("sends HSTS in production only, without includeSubDomains or preload", async () => {
    const prod = await loadHeaders({ NODE_ENV: "production" });
    expect(prod.map["Strict-Transport-Security"]).toBe("max-age=63072000");
    const dev = await loadHeaders({ NODE_ENV: "development" });
    expect(dev.map["Strict-Transport-Security"]).toBeUndefined();
  });

  it("the enforced CSP forbids framing, plugins, and base/form hijacking", async () => {
    const { map } = await loadHeaders({ NODE_ENV: "production" });
    const csp = map["Content-Security-Policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toMatch(/\s;/);
  });

  it("allows Cloudflare Turnstile (script, frame, verification request)", async () => {
    const { map } = await loadHeaders({ NODE_ENV: "production" });
    const csp = map["Content-Security-Policy"];
    expect(csp).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(csp).toMatch(/frame-src https:\/\/challenges\.cloudflare\.com/);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  });

  it("keeps Google Analytics hosts out of the policy until a measurement id is configured", async () => {
    const { map } = await loadHeaders({ NODE_ENV: "production" });
    expect(map["Content-Security-Policy"]).not.toContain("google");
  });

  it("allows Google Analytics script, beacons, and pixel when a measurement id is configured", async () => {
    const { map } = await loadHeaders({
      NODE_ENV: "production",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST123",
    });
    const csp = map["Content-Security-Policy"];
    expect(csp).toMatch(/script-src [^;]*https:\/\/www\.googletagmanager\.com/);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/\*\.google-analytics\.com/);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/\*\.analytics\.google\.com/);
    expect(csp).toMatch(/img-src [^;]*https:\/\/www\.google-analytics\.com/);
  });

  it("only allows eval in development (needed by React Refresh)", async () => {
    const dev = await loadHeaders({ NODE_ENV: "development" });
    expect(dev.map["Content-Security-Policy"]).toContain("'unsafe-eval'");
  });
});
