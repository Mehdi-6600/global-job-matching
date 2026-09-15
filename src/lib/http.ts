import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type RateLimitInfo = {
  success: boolean;
  limit?: number;
  remaining?: number;
  /** Epoch milliseconds when the window resets */
  reset?: number;
};

export type ApiErrorBody = {
  error: string;
  code?: string;
  details?: unknown;
  limit?: number;
  used?: number;
};

/**
 * Consistent API error JSON: { error, code?, details?, limit?, used? }
 */
export function apiError(
  status: number,
  error: string,
  extras?: Omit<ApiErrorBody, "error">
): NextResponse {
  const body: ApiErrorBody = { error, ...extras };
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function validationError(
  zodError: ZodError,
  message = "Invalid input"
): NextResponse {
  return apiError(400, message, {
    code: "VALIDATION_ERROR",
    details: zodError.flatten().fieldErrors,
  });
}

export function unauthorizedError(
  message = "Unauthorized"
): NextResponse {
  return apiError(401, message, { code: "UNAUTHORIZED" });
}

export function forbiddenError(message = "Forbidden"): NextResponse {
  return apiError(403, message, { code: "FORBIDDEN" });
}

export function notFoundError(message = "Not found"): NextResponse {
  return apiError(404, message, { code: "NOT_FOUND" });
}

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
