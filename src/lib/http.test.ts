import { describe, it, expect } from "vitest";
import { rateLimitedResponse } from "./http";

describe("rateLimitedResponse", () => {
  it("returns 429 with RATE_LIMITED code", async () => {
    const res = rateLimitedResponse();
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("RATE_LIMITED");
    expect(typeof body.error).toBe("string");
  });

  it("sets rate limit headers when info is provided", () => {
    const reset = Date.now() + 30_000;
    const res = rateLimitedResponse({
      success: false,
      limit: 10,
      remaining: 0,
      reset,
    });

    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
  });

  it("uses custom message", async () => {
    const res = rateLimitedResponse(undefined, "Slow down");
    const body = await res.json();
    expect(body.error).toBe("Slow down");
  });
});
