import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// اگر Redis تنظیم نشده باشد، gracefully رد نمی‌کند (برای dev)
const fallbackLimiter = {
  limit: async () => ({ success: true, limit: 100, remaining: 100, reset: 0 }),
} as unknown as Ratelimit;

export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "rl",
    })
  : fallbackLimiter;

// Rate limiter سنگین‌تر برای Auth (5 بار در دقیقه)
export const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "rl_auth",
    })
  : fallbackLimiter;

// Rate limiter خیلی سنگین برای Email (2 بار در ساعت)
export const emailRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, "1 h"),
      analytics: true,
      prefix: "rl_email",
    })
  : fallbackLimiter;
