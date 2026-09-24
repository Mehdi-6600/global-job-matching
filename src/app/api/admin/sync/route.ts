import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { adminRatelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { runIngestion } from "@/lib/jobs/ingestion/pipeline";

/**
 * POST /api/admin/sync
 *
 * Admin-only manual trigger of the ingestion pipeline. Does NOT
 * bypass the legal gate — the pipeline's isProductionIngestAllowed
 * check still runs for every source. This endpoint only removes the
 * need to hold SYNC_SECRET in a browser.
 *
 * Optional query params:
 *   ?source=greenhouse          (comma-separated list also ok)
 *   ?resetCheckpoint=1          clear saved page/cursor before run
 */
export async function POST(req: NextRequest) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return authz.response;

    const ip = getRequestIp(req);
    const { success } = await adminRatelimit.limit(
      `admin_sync_${authz.user.id}_${ip}`,
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
    }

    const sourceParam = req.nextUrl.searchParams.get("source");
    const sourceKeys = sourceParam
      ? sourceParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const resetRaw = req.nextUrl.searchParams.get("resetCheckpoint");
    const resetCheckpoint =
      resetRaw === "1" ||
      resetRaw === "true" ||
      resetRaw === "yes";

    const started = Date.now();
    const stats = await runIngestion({ sourceKeys, resetCheckpoint });

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - started,
      resetCheckpoint,
      stats,
    });
  } catch (error) {
    console.error("Admin sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}
