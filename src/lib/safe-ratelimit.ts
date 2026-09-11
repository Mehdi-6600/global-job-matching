import type { RateLimitInfo } from "@/lib/http";

type Limiter = {
  limit: (key: string) => Promise<{
    success: boolean;
    limit?: number;
    remaining?: number;
    reset?: number;
  }>;
};

/**
 * Never throws. If Redis/Upstash fails, allow the request
 * (fail-open for auth UX) so login/register/forgot stay usable.
 */
export async function safeLimit(
  limiter: Limiter,
  key: string
): Promise<RateLimitInfo> {
  try {
    const result = await limiter.limit(key);
    return {
      success: result.success !== false,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[safeLimit] limiter failed, allowing request:", error);
    return {
      success: true,
      limit: 0,
      remaining: 0,
    };
  }
}
