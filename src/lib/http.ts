import { NextResponse } from "next/server";

export type RateLimitInfo = {
  success: boolean;
  limit?: number;
  remaining?: number;
  /** Epoch milliseconds when the window resets */
  reset?: number;
};

/**
 * Consistent 429 response with standard rate-limit headers.
 */
export function rateLimitedResponse(
  info?: Partial<RateLimitInfo>,
  message = "Too many requests. Please try again later."
): NextResponse {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
  };

  if (typeof info?.limit === "number") {
    headers["X-RateLimit-Limit"] = String(info.limit);
  }

  if (typeof info?.remaining === "number") {
    headers["X-RateLimit-Remaining"] = String(Math.max(0, info.remaining));
  }

  if (typeof info?.reset === "number" && Number.isFinite(info.reset)) {
    const resetSec = Math.ceil(info.reset / 1000);
    headers["X-RateLimit-Reset"] = String(resetSec);

    const retryAfterSec = Math.max(
      1,
      Math.ceil((info.reset - Date.now()) / 1000)
    );
    headers["Retry-After"] = String(retryAfterSec);
  }

  return NextResponse.json(
    {
      error: message,
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Safe JSON body parse — returns null on invalid JSON.
 */
export async function readJsonBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
