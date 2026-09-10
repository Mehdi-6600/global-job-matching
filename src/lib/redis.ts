import { Redis } from "@upstash/redis";

/**
 * Support all common Vercel / Upstash env shapes:
 * - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * - KV_REST_API_URL + KV_REST_API_TOKEN
 * - KV_URL + KV_REST_API_TOKEN (legacy)
 */
function resolveRedisEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    process.env.KV_URL?.trim() ||
    "";

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    "";

  if (!url || !token) return null;
  return { url, token };
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
