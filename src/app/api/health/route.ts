import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCryptoWallets } from "@/lib/payment/plans";
import { getRedisEnvStatus, isRedisConfigured } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function envPresent(name: string): boolean {
  const v = process.env[name];
  return Boolean(v && String(v).trim().length > 0);
}

export async function GET() {
  const started = Date.now();

  let database: "ok" | "error" = "ok";
  let dbMs = 0;

  try {
    const t0 = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbMs = Date.now() - t0;
  } catch (err) {
    database = "error";
    console.error("Health DB check failed:", err);
  }

  const totalMs = Date.now() - started;
  const redisStatus = getRedisEnvStatus();
  const redisOk = isRedisConfigured();
  const production = process.env.NODE_ENV === "production";

  const healthy = database === "ok";
  const status =
    !healthy ? "degraded" : production && !redisOk ? "degraded" : "ok";

  let walletCount = 0;
  try {
    walletCount = getCryptoWallets().length;
  } catch {
    walletCount = 0;
  }

  const config = {
    databaseUrl: envPresent("DATABASE_URL"),
    authSecret: envPresent("AUTH_SECRET"),
    appUrl:
      envPresent("NEXT_PUBLIC_APP_URL") || envPresent("NEXT_PUBLIC_SITE_URL"),
    ownerEmail: envPresent("OWNER_EMAIL"),
    resend: envPresent("RESEND_API_KEY"),
    cronSecret: envPresent("CRON_SECRET"),
    blob: envPresent("BLOB_READ_WRITE_TOKEN"),
    redis: {
      connected: redisOk,
      hasUrl: redisStatus.hasUrl,
      hasToken: redisStatus.hasToken,
      source: redisStatus.source,
      urlPreview: redisStatus.urlPreview,
    },
    openRouter: envPresent("OPENROUTER_API_KEY"),
    openAi: envPresent("OPENAI_API_KEY"),
    cryptoWalletsConfigured: walletCount,
  };

  const warnings: string[] = [];
  if (production && !redisOk) {
    if (redisStatus.hasUrl && !redisStatus.hasToken) {
      warnings.push(
        "Redis URL found but TOKEN missing. Add UPSTASH_REDIS_REST_TOKEN or KV_REST_API_TOKEN (or UPSTASH_KV_REDIS_TOKEN)."
      );
    } else if (!redisStatus.hasUrl && redisStatus.hasToken) {
      warnings.push(
        "Redis TOKEN found but HTTPS REST URL missing. Add UPSTASH_REDIS_REST_URL / KV_REST_API_URL / UPSTASH_KV_REDIS_URL (must start with https://)."
      );
    } else {
      warnings.push(
        "Rate limiting uses in-memory fallback. Set a pair: UPSTASH_REDIS_REST_URL+TOKEN or KV_REST_API_URL+TOKEN or UPSTASH_KV_REDIS_URL+TOKEN."
      );
    }
  }
  if (!config.blob) {
    warnings.push("BLOB_READ_WRITE_TOKEN missing — resume upload disabled.");
  }

  return NextResponse.json(
    {
      status,
      service: "global-job-matching",
      time: new Date().toISOString(),
      checks: {
        database: {
          status: database,
          latencyMs: dbMs,
        },
        rateLimit: {
          status: redisOk ? "redis" : "memory",
          sharedAcrossInstances: redisOk,
        },
        config,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      latencyMs: totalMs,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
      region: process.env.VERCEL_REGION || null,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
