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

  it("blocks AI when infrastructure throws (fail-closed)", async () => {
    const limiter = {
      limit: vi.fn().mockRejectedValue(new Error("upstash timeout")),
    };
    const result = await strictAiLimit(limiter, "ai3");
    expect(result.success).toBe(false);
    expect(result.infraFailed).toBe(true);
  });
});
