import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";
import { runIngestion } from "@/lib/jobs/ingestion/pipeline";
import { getEnabledSources, SOURCE_REGISTRY } from "@/lib/jobs/ingestion/registry";

function isAuthorized(request: NextRequest): boolean {
  if (isAuthorizedBearerSecret(request, env.SYNC_SECRET)) return true;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && isAuthorizedBearerSecret(request, cronSecret)) return true;
  return false;
}

/**
 * Job ingestion entrypoint (cron + manual).
 * Only APPROVED+enabled sources run. Employer jobs are never updated.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const stats = await runIngestion();
    const enabled = getEnabledSources().map((s) => s.key);
    const blocked = SOURCE_REGISTRY.filter(
      (s) => !enabled.includes(s.key)
    ).map((s) => ({ key: s.key, licenseStatus: s.licenseStatus, enabled: s.enabled }));

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - started,
      enabledSources: enabled,
      blockedSources: blocked,
      stats,
    });
  } catch (error) {
    console.error("[jobs/sync] fatal:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
