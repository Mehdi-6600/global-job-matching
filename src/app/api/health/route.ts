import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      status: "healthy",
      db: "up",
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        ok: false,
        status: "degraded",
        db: "down",
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
