import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Serverless-safe rate limiting via Upstash Redis. In-memory limiting does
 * NOT work reliably across serverless function invocations (e.g. Vercel),
 * so Redis is required in production. Locally, if the env vars are unset,
 * limiting is skipped with a logged warning rather than crashing the route.
 */

const hasUpstashConfig =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) && Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

let ratelimit: Ratelimit | null = null;

if (hasUpstashConfig) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "magnolia-grove:contact",
  });
} else if (process.env.NODE_ENV !== "production") {
  console.warn(
    "[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting is disabled in this environment."
  );
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  if (!ratelimit) {
    // No Redis configured — allow the request through (dev-only fallback).
    return { success: true, limit: 0, remaining: 0 };
  }

  const result = await ratelimit.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
  };
}
