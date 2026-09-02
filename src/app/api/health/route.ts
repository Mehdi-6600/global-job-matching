import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();

  let database: "ok" | "error" = "ok";
  let dbMs = 0;
  let errorMessage: string | null = null;

  try {
    const t0 = Date.now();
    // Lightweight connectivity check
    await db.$queryRaw`SELECT 1`;
    dbMs = Date.now() - t0;
  } catch (err) {
    database = "error";
    errorMessage =
      err instanceof Error ? err.message.slice(0, 200) : "database error";
  }

  const totalMs = Date.now() - started;
  const healthy = database === "ok";

  const body = {
    status: healthy ? "ok" : "degraded",
    service: "global-job-matching",
    time: new Date().toISOString(),
    checks: {
      database: {
        status: database,
        latencyMs: dbMs,
        ...(errorMessage ? { error: errorMessage } : {}),
      },
    },
    latencyMs: totalMs,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
  };

  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
