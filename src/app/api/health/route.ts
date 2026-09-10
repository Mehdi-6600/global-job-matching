import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCryptoWallets } from "@/lib/payment/plans";
import { isRedisConfigured } from "@/lib/redis";

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
  const redisOk = isRedisConfigured();
  const production = process.env.NODE_ENV === "production";

  // Degraded if DB down; in production also warn when rate-limit backend missing
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
    upstash:
      envPresent("UPSTASH_REDIS_REST_URL") ||
      envPresent("KV_REST_API_URL") ||
      envPresent("KV_URL"),
    redisConnected: redisOk,
    openRouter: envPresent("OPENROUTER_API_KEY"),
    openAi: envPresent("OPENAI_API_KEY"),
    cryptoWalletsConfigured: walletCount,
  };

  const warnings: string[] = [];
  if (production && !redisOk) {
    warnings.push(
      "Rate limiting uses in-memory fallback (not shared across instances). Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN."
    );
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
