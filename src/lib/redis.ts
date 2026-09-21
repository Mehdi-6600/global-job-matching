import { Redis } from "@upstash/redis";

export type RedisEnvStatus = {
  configured: boolean;
  hasUrl: boolean;
  hasToken: boolean;
  source: string | null;
  urlPreview: string | null;
};

function trimEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

function isRestUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

function pickUrl(): { url: string; source: string } | null {
  const candidates: Array<[string, string]> = [
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_URL"],
    ["KV_REST_API_URL", "KV_REST_API_URL"],
    ["UPSTASH_KV_REST_API_URL", "UPSTASH_KV_REST_API_URL"],
    ["UPSTASH_KV_REDIS_URL", "UPSTASH_KV_REDIS_URL"],
    ["UPSTASH_REDIS_URL", "UPSTASH_REDIS_URL"],
  ];

  for (const [envName, source] of candidates) {
    const url = trimEnv(envName);
    if (url && isRestUrl(url)) {
      return { url, source };
    }
  }

  for (const [envName, source] of [
    ["KV_URL", "KV_URL"],
    ["UPSTASH_KV_KV_URL", "UPSTASH_KV_KV_URL"],
  ] as const) {
    const url = trimEnv(envName);
    if (url && isRestUrl(url)) {
      return { url, source };
    }
  }

  return null;
}

function pickToken(): { token: string; source: string } | null {
  const candidates: Array<[string, string]> = [
    ["UPSTASH_REDIS_REST_TOKEN", "UPSTASH_REDIS_REST_TOKEN"],
    ["KV_REST_API_TOKEN", "KV_REST_API_TOKEN"],
    ["UPSTASH_KV_REST_API_TOKEN", "UPSTASH_KV_REST_API_TOKEN"],
    ["UPSTASH_KV_REDIS_TOKEN", "UPSTASH_KV_REDIS_TOKEN"],
    ["UPSTASH_REDIS_TOKEN", "UPSTASH_REDIS_TOKEN"],
  ];

  for (const [envName, source] of candidates) {
    const token = trimEnv(envName);
    if (token) return { token, source };
  }
  return null;
}

export function getRedisEnvStatus(): RedisEnvStatus {
  const urlPick = pickUrl();
  const tokenPick = pickToken();

  const anyUrlPresent = Boolean(
    trimEnv("UPSTASH_REDIS_REST_URL") ||
      trimEnv("KV_REST_API_URL") ||
      trimEnv("UPSTASH_KV_REST_API_URL") ||
      trimEnv("UPSTASH_KV_REDIS_URL") ||
      trimEnv("UPSTASH_REDIS_URL") ||
      trimEnv("KV_URL") ||
      trimEnv("UPSTASH_KV_KV_URL"),
  );

  const configured = Boolean(urlPick && tokenPick);

  return {
    configured,
    hasUrl: Boolean(urlPick) || anyUrlPresent,
    hasToken: Boolean(tokenPick),
    source:
      configured && urlPick && tokenPick
        ? `${urlPick.source}+${tokenPick.source}`
        : null,
    urlPreview: urlPick
      ? urlPick.url.replace(/^(https:\/\/[^/]{0,28}).*$/i, "$1…")
      : anyUrlPresent
        ? "(found env but not https REST — need https://…upstash.io)"
        : null,
  };
}

/**
 * Redis is DISABLED until Upstash credentials are re-provisioned.
 * Previous attempt used a stale/mismatched token which caused every
 * rate-limited endpoint to fail with WRONGPASS -> 500.
 *
 * To re-enable:
 *   1. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel.
 *   2. Replace `return null;` below with the original client code.
 */
function createClient(): Redis | null {
  return null;
}

export const redis: Redis | null = createClient();

export function isRedisConfigured(): boolean {
  return redis !== null;
}
