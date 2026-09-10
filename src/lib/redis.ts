import { Redis } from "@upstash/redis";

export type RedisEnvStatus = {
  configured: boolean;
  hasUrl: boolean;
  hasToken: boolean;
  source: "upstash" | "kv_rest" | "kv_url" | null;
};

/**
 * Resolve Redis credentials from any supported Vercel/Upstash shape.
 * Both URL and TOKEN are required.
 */
export function getRedisEnvStatus(): RedisEnvStatus {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() || "";
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";

  const kvRestUrl = process.env.KV_REST_API_URL?.trim() || "";
  const kvToken =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    "";

  const kvUrl = process.env.KV_URL?.trim() || "";

  if (upstashUrl && upstashToken) {
    return {
      configured: true,
      hasUrl: true,
      hasToken: true,
      source: "upstash",
    };
  }

  if (kvRestUrl && kvToken) {
    return {
      configured: true,
      hasUrl: true,
      hasToken: true,
      source: "kv_rest",
    };
  }

  if (kvUrl && kvToken) {
    return {
      configured: true,
      hasUrl: true,
      hasToken: true,
      source: "kv_url",
    };
  }

  const hasUrl = Boolean(upstashUrl || kvRestUrl || kvUrl);
  const hasToken = Boolean(
    upstashToken ||
      process.env.KV_REST_API_TOKEN?.trim() ||
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );

  return {
    configured: false,
    hasUrl,
    hasToken,
    source: null,
  };
}

function resolveRedisEnv(): { url: string; token: string } | null {
  const status = getRedisEnvStatus();
  if (!status.configured) return null;

  if (status.source === "upstash") {
    return {
      url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    };
  }

  if (status.source === "kv_rest") {
    return {
      url: process.env.KV_REST_API_URL!.trim(),
      token: (
        process.env.KV_REST_API_TOKEN ||
        process.env.UPSTASH_REDIS_REST_TOKEN ||
        ""
      ).trim(),
    };
  }

  if (status.source === "kv_url") {
    return {
      url: process.env.KV_URL!.trim(),
      token: (
        process.env.KV_REST_API_TOKEN ||
        process.env.UPSTASH_REDIS_REST_TOKEN ||
        ""
      ).trim(),
    };
  }

  return null;
}

const creds = resolveRedisEnv();

export const redis: Redis | null = creds
  ? new Redis({
      url: creds.url,
      token: creds.token,
    })
  : null;

export function isRedisConfigured(): boolean {
  return redis !== null;
}
