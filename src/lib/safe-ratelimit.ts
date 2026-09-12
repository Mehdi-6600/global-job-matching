import type { RateLimitInfo } from "@/lib/http";

type Limiter = {
  limit: (key: string) => Promise<{
    success: boolean;
    limit?: number;
    remaining?: number;
    reset?: number;
  }>;
};

export type StrictLimitResult = RateLimitInfo & {
  /** true when Redis/Upstash threw — caller must NOT run expensive AI */
  infraFailed?: boolean;
};

/**
 * Fail-open for cheap UX paths (login list, non-AI reads).
 * Never use this for paid/expensive AI generation.
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

/**
 * Fail-closed for AI endpoints.
 * If Redis/Upstash is down → success=false + infraFailed=true
 * → route must return HTTP 503 and must NOT call the model.
 */
export async function strictAiLimit(
  limiter: Limiter,
  key: string
): Promise<StrictLimitResult> {
  try {
    const result = await limiter.limit(key);
    return {
      success: result.success !== false,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      infraFailed: false,
    };
  } catch (error) {
    console.error("[strictAiLimit] limiter infrastructure failed:", error);
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60_000,
      infraFailed: true,
    };
  }
}
