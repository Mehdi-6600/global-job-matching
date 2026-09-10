import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("getRedisEnvStatus", () => {
  const keys = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "KV_URL",
  ] as const;

  const backup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  it("reports incomplete when only URL is set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    // dynamic import after env set — module may be cached; test pure function via re-import pattern
    const { getRedisEnvStatus } = await import("./redis");
    const status = getRedisEnvStatus();
    expect(status.hasUrl).toBe(true);
    expect(status.hasToken).toBe(false);
    expect(status.configured).toBe(false);
  });

  it("configures when upstash url+token set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token-value";
    const { getRedisEnvStatus } = await import("./redis");
    const status = getRedisEnvStatus();
    expect(status.configured).toBe(true);
    expect(status.source).toBe("upstash");
  });
});
