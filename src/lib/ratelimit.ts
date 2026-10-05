import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Serverless-safe rate limiting via Upstash Redis. In-memory limiting does
 * NOT work reliably across serverless function invocations (e.g. Vercel),
 * so Redis is required in production.
 *
 * - Outside production with no Redis configured: limiting is skipped (a
 *   one-time warning is logged) so local dev and tests are unaffected.
 * - In production with no Redis configured: a loud error is logged once and a
 *   per-instance in-memory limiter is used. That is far weaker than Redis
 *   (each warm instance counts separately) but is better than nothing, and
 *   it never crashes a request.
 * - If Redis itself errors at request time, the policy's failClosed flag
 *   decides: credential and payment endpoints refuse, form endpoints allow.
 */

export interface RateLimitPolicy {
  /** Becomes part of the Redis key prefix, so each policy counts independently. */
  name: string;
  limit: number;
  windowSeconds: number;
  /** Refuse (rather than allow) when the limiter backend is unavailable. */
  failClosed?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the caller may retry; only set when success is false. */
  retryAfterSeconds?: number;
}

const DEFAULT_POLICY: RateLimitPolicy = { name: "contact", limit: 5, windowSeconds: 600 };

const hasUpstashConfig = () =>
  Boolean(process.env.UPSTASH_REDIS_REST_URL) && Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const isProduction = () => process.env.NODE_ENV === "production";

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();
const memoryHits = new Map<string, number[]>();
let warnedMissingConfig = false;

function warnOnceMissingConfig() {
  if (warnedMissingConfig) return;
  warnedMissingConfig = true;
  if (isProduction()) {
    console.error(
      "[ratelimit] CRITICAL: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set in production. " +
        "Falling back to per-instance in-memory limits, which do not hold across serverless instances. " +
        "Configure Upstash Redis to protect the contact, checkout, and login endpoints."
    );
  } else {
    console.warn(
      "[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting is disabled in this environment."
    );
  }
}

function getLimiter(policy: RateLimitPolicy): Ratelimit {
  let limiter = limiters.get(policy.name);
  if (!limiter) {
    redis ??= new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(policy.limit, `${policy.windowSeconds} s`),
      prefix: `magnolia-grove:${policy.name}`,
    });
    limiters.set(policy.name, limiter);
  }
  return limiter;
}

function checkMemory(identifier: string, policy: RateLimitPolicy): RateLimitResult {
  const now = Date.now();
  const windowMs = policy.windowSeconds * 1000;
  const key = `${policy.name}:${identifier}`;
  const recent = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= policy.limit) {
    memoryHits.set(key, recent);
    const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    return { success: false, limit: policy.limit, remaining: 0, retryAfterSeconds };
  }

  recent.push(now);
  memoryHits.set(key, recent);

  // Keep the map from growing without bound under a many-identifier flood.
  if (memoryHits.size > 10_000) {
    for (const [k, hits] of memoryHits) {
      if (hits.every((t) => now - t >= windowMs)) memoryHits.delete(k);
    }
  }
  return { success: true, limit: policy.limit, remaining: policy.limit - recent.length };
}

export async function checkRateLimit(
  identifier: string,
  policy: RateLimitPolicy = DEFAULT_POLICY
): Promise<RateLimitResult> {
  if (!hasUpstashConfig()) {
    warnOnceMissingConfig();
    if (!isProduction()) {
      // Dev/test fallback: allow everything.
      return { success: true, limit: 0, remaining: 0 };
    }
    return checkMemory(identifier, policy);
  }

  try {
    const result = await getLimiter(policy).limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      ...(result.success
        ? {}
        : { retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) }),
    };
  } catch (error) {
    console.error(
      `[ratelimit] limiter backend error for policy "${policy.name}":`,
      error instanceof Error ? error.message : error
    );
    if (policy.failClosed) {
      return { success: false, limit: policy.limit, remaining: 0, retryAfterSeconds: 60 };
    }
    return { success: true, limit: 0, remaining: 0 };
  }
}

/** Test hook: clears cached limiters and in-memory counters. */
export function __resetRateLimitForTests() {
  limiters.clear();
  memoryHits.clear();
  redis = null;
  warnedMissingConfig = false;
}
