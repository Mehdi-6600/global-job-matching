import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    // Internal detail only in server logs — never in response body
    console.error("Health DB check failed:", err);
  }

  const totalMs = Date.now() - started;
  const healthy = database === "ok";

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
      envPresent("UPSTASH_REDIS_REST_URL") || envPresent("KV_REST_API_URL"),
  };

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "global-job-matching",
      time: new Date().toISOString(),
      checks: {
        database: {
          status: database,
          latencyMs: dbMs,
        },
        config,
      },
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
