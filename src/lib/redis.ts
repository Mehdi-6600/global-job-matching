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

/** @upstash/redis needs HTTPS REST endpoint, not rediss:// TCP */
function isRestUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

function pickUrl(): { url: string; source: string } | null {
  const candidates: Array<[string, string]> = [
    // Standard Upstash
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_URL"],
    // Vercel KV classic
    ["KV_REST_API_URL", "KV_REST_API_URL"],
    // Vercel + Upstash marketplace (YOUR setup)
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

  // KV_URL / UPSTASH_KV_KV_URL are often rediss:// — only accept https
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
    // Vercel + Upstash marketplace (YOUR setup)
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
      trimEnv("UPSTASH_KV_KV_URL")
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

function createClient(): Redis | null {
  try {
    if (
      (trimEnv("UPSTASH_REDIS_REST_URL") &&
        trimEnv("UPSTASH_REDIS_REST_TOKEN")) ||
      (trimEnv("KV_REST_API_URL") && trimEnv("KV_REST_API_TOKEN"))
    ) {
      return Redis.fromEnv();
    }
  } catch {
    // fall through
  }

  const urlPick = pickUrl();
  const tokenPick = pickToken();
  if (!urlPick || !tokenPick) return null;

  return new Redis({
    url: urlPick.url,
    token: tokenPick.token,
  });
}

export const redis: Redis | null = createClient();

export function isRedisConfigured(): boolean {
  return redis !== null;
}
