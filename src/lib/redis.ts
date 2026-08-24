import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

if (process.env.KV_URL && process.env.KV_REST_API_TOKEN) {
  redis = new Redis({
    url: process.env.KV_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

export { redis };
