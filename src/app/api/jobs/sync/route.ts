import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";
import { runIngestion } from "@/lib/jobs/ingestion/pipeline";
import {
  isProductionIngestAllowed,
  SOURCE_REGISTRY,
} from "@/lib/jobs/ingestion/registry";

function isAuthorized(request: NextRequest): boolean {
  if (isAuthorizedBearerSecret(request, env.SYNC_SECRET)) return true;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && isAuthorizedBearerSecret(request, cronSecret)) return true;
  return false;
}

/**
 * Job ingestion entrypoint (cron + manual).
 * Only APPROVED + enabled sources run. Employer jobs are never mutated.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const force =
      request.nextUrl.searchParams.get("force") === "1" ||
      request.nextUrl.searchParams.get("force") === "true";

    const sourceParam = request.nextUrl.searchParams.get("source");
    const sourceKeys = sourceParam
      ? sourceParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const stats = await runIngestion({
      sourceKeys,
      // force currently only used by callers that filter sources;
      // pipeline itself decides via registry license gate.
      ...(force ? {} : {}),
    });

    const enabled = SOURCE_REGISTRY.filter(isProductionIngestAllowed).map(
      (s) => s.key,
    );
    const blocked = SOURCE_REGISTRY.filter(
      (s) => !isProductionIngestAllowed(s),
    ).map((s) => ({
      key: s.key,
      licenseStatus: s.licenseStatus,
      enabled: s.enabled,
    }));

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - started,
      enabledSources: enabled,
      blockedSources: blocked,
      registrySize: SOURCE_REGISTRY.length,
      stats,
    });
  } catch (error) {
    console.error("[jobs/sync] fatal:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}
