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

/**
 * Public readiness probe for Vercel / uptime monitors.
 * Never returns secrets — only booleans and safe counts.
 */
export async function GET() {
  const started = Date.now();
  const production = process.env.NODE_ENV === "production";

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

  const redisStatus = getRedisEnvStatus();
  const redisOk = isRedisConfigured();

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
        "Redis URL found but TOKEN missing. Add UPSTASH_REDIS_REST_TOKEN or KV_REST_API_TOKEN."
      );
    } else if (!redisStatus.hasUrl && redisStatus.hasToken) {
      warnings.push(
        "Redis TOKEN found but HTTPS REST URL missing. Add UPSTASH_REDIS_REST_URL (must start with https://)."
      );
    } else {
      warnings.push(
        "Rate limiting uses in-memory fallback. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN."
      );
    }
  }

  if (production && walletCount < 1) {
    warnings.push(
      "No crypto wallets configured. Paid plan checkout cannot receive funds."
    );
  }

  if (production && !config.resend) {
    warnings.push(
      "RESEND_API_KEY missing. Password reset and transactional email will fail."
    );
  }

  if (production && !config.cronSecret) {
    warnings.push(
      "CRON_SECRET missing. Plan expiry and job sync crons cannot authenticate."
    );
  }

  if (production && dbMs > 2000) {
    warnings.push(
      `Database latency is high (${dbMs}ms). Check Neon region / connection pool.`
    );
  }

  const healthy = database === "ok";
  const degraded =
    !healthy ||
    (production && !redisOk) ||
    (production && walletCount < 1 && config.appUrl);

  const status: "ok" | "degraded" | "error" = !healthy
    ? "error"
    : degraded
      ? "degraded"
      : "ok";

  const totalMs = Date.now() - started;

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
        payments: {
          walletsConfigured: walletCount,
          ready: walletCount > 0,
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
