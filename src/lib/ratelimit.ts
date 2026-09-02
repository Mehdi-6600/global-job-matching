import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * In-memory fallback (per server instance).
 * Better than allowing unlimited traffic when Redis is missing.
 */
function createMemoryLimiter(
  max: number,
  windowMs: number
): { limit: (key: string) => Promise<LimitResult> } {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    async limit(key: string): Promise<LimitResult> {
      const now = Date.now();
      const row = hits.get(key);

      if (!row || now > row.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return {
          success: true,
          limit: max,
          remaining: max - 1,
          reset: now + windowMs,
        };
      }

      if (row.count >= max) {
        return {
          success: false,
          limit: max,
          remaining: 0,
          reset: row.resetAt,
        };
      }

      row.count += 1;
      hits.set(key, row);
      return {
        success: true,
        limit: max,
        remaining: max - row.count,
        reset: row.resetAt,
      };
    },
  };
}

const memoryGeneral = createMemoryLimiter(10, 60_000);
const memoryAuth = createMemoryLimiter(5, 60_000);
const memoryEmail = createMemoryLimiter(2, 60 * 60_000);

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "[ratelimit] Redis/KV not configured — using in-memory limiter (not shared across instances)."
  );
}

export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "rl",
    })
  : memoryGeneral;

export const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "rl_auth",
    })
  : memoryAuth;

export const emailRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, "1 h"),
      analytics: true,
      prefix: "rl_email",
    })
  : memoryEmail;
