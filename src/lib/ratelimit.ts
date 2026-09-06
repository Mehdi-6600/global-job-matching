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
function createMemoryLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    async limit(key: string): Promise<LimitResult> {
      const now = Date.now();
      const row = hits.get(key);

      if (!row || now > row.resetAt) {
        const resetAt = now + windowMs;
        hits.set(key, { count: 1, resetAt });
        return {
          success: true,
          limit: max,
          remaining: max - 1,
          reset: resetAt,
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
const memoryLogin = createMemoryLimiter(8, 60_000);
const memoryAi = createMemoryLimiter(3, 60_000);
const memoryStrict = createMemoryLimiter(20, 60_000);
const memoryAdmin = createMemoryLimiter(30, 60_000);

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "[ratelimit] Redis/KV not configured — using in-memory limiter (not shared across instances)."
  );
}

/** General API: 10 / minute */
export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "rl",
    })
  : memoryGeneral;

/** Auth-sensitive: register, password change, reset */
export const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "rl_auth",
    })
  : memoryAuth;

/** Login attempts */
export const loginRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(8, "1 m"),
      analytics: true,
      prefix: "rl_login",
    })
  : memoryLogin;

/** Transactional email */
export const emailRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, "1 h"),
      analytics: true,
      prefix: "rl_email",
    })
  : memoryEmail;

/** AI endpoints (resume / career risk) */
export const aiRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 m"),
      analytics: true,
      prefix: "rl_ai",
    })
  : memoryAi;

/** Public write-ish endpoints (contact, analytics, messages) */
export const strictRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      analytics: true,
      prefix: "rl_strict",
    })
  : memoryStrict;

/** Admin panel APIs */
export const adminRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "rl_admin",
    })
  : memoryAdmin;
