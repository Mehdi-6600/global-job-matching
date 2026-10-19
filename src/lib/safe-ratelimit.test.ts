import { describe, it, expect, vi } from "vitest";
import { safeLimit, strictAiLimit } from "@/lib/safe-ratelimit";

describe("safeLimit (fail-open)", () => {
  it("returns success when limiter allows", async () => {
    const limiter = {
      limit: vi.fn().mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60_000,
      }),
    };
    const result = await safeLimit(limiter, "k1");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("returns success=false when limiter denies", async () => {
    const limiter = {
      limit: vi.fn().mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 30_000,
      }),
    };
    const result = await safeLimit(limiter, "k2");
    expect(result.success).toBe(false);
  });

  it("allows request when infrastructure throws (fail-open)", async () => {
    const limiter = {
      limit: vi.fn().mockRejectedValue(new Error("redis down")),
    };
    const result = await safeLimit(limiter, "k3");
    expect(result.success).toBe(true);
  });
});

describe("strictAiLimit (fail-closed)", () => {
  it("returns success when limiter allows", async () => {
    const limiter = {
      limit: vi.fn().mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 60_000,
      }),
    };
    const result = await strictAiLimit(limiter, "ai1");
    expect(result.success).toBe(true);
    expect(result.infraFailed).toBe(false);
  });

  it("returns success=false when quota exceeded", async () => {
    const limiter = {
      limit: vi.fn().mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 60_000,
      }),
    };
    const result = await strictAiLimit(limiter, "ai2");
    expect(result.success).toBe(false);
    expect(result.infraFailed).toBe(false);
  });

  // Policy (safe-ratelimit.ts, "رفتار جدید"): when the primary limiter fails,
  // requests fall back to a per-instance memory limiter (3/min). The AI cap is
  // still enforced, the result is marked degraded, and infraFailed stays false.
  // This test previously expected an immediate block, which contradicted that
  // documented design. Owner decision: see the rate-limit note in the PR.
  it("falls back to the memory cap when the primary throws (degraded, still enforced)", async () => {
    const limiter = {
      limit: vi.fn().mockRejectedValue(new Error("upstash timeout")),
    };
    const key = "ai-degraded-cap";
    const results: Awaited<ReturnType<typeof strictAiLimit>>[] = [];
    for (let i = 0; i < 4; i++) {
      results.push(await strictAiLimit(limiter, key));
    }
    expect(results.slice(0, 3).every((r) => r.success && r.degraded)).toBe(true);
    expect(results[3].success).toBe(false);
    expect(results.every((r) => r.infraFailed === false)).toBe(true);
  });
});
