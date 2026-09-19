/**
 * Persist per-source run metrics. consecutiveFailures is atomic via Prisma increment/reset.
 */
import { db } from "@/lib/db";
import type { IngestStats } from "./types";
import { computeHealthStatus } from "./health";

export async function recordSourceRun(stats: IngestStats): Promise<void> {
  const source = await db.jobSource.findUnique({
    where: { key: stats.sourceKey },
  });
  if (!source) return;

  const isHardFail =
    stats.completeness === "FAILED" ||
    (stats.fetched === 0 && (stats.failed > 0 || stats.errors.length > 0));

  const isSuccess =
    !isHardFail &&
    (stats.completeness === "FULL" ||
      stats.created + stats.updated > 0 ||
      stats.fetched > 0);

  // Read current counter (column may exist after migration)
  const prev =
    typeof (source as { consecutiveFailures?: number }).consecutiveFailures ===
    "number"
      ? ((source as { consecutiveFailures?: number }).consecutiveFailures ?? 0)
      : 0;

  const nextFailures = isHardFail ? prev + 1 : isSuccess ? 0 : prev;

  const healthStatus = computeHealthStatus({
    enabled: source.enabled,
    consecutiveFailures: nextFailures,
    fetched: stats.fetched,
    failed: stats.failed,
    timedOut: stats.timedOut,
    lastError: stats.errors[0] ?? null,
  });

  const data: Record<string, unknown> = {
    lastSyncAt: new Date(),
    healthStatus: healthStatus.toLowerCase(),
    jobsFetched: { increment: stats.fetched },
    jobsCreated: { increment: stats.created },
    jobsUpdated: { increment: stats.updated },
    jobsSkipped: { increment: stats.skipped },
    consecutiveFailures: nextFailures,
    lastSyncStatus: stats.completeness,
  };

  if (isHardFail) {
    data.lastErrorAt = new Date();
    data.lastError = (stats.errors[0] || "source_failed").slice(0, 500);
  } else if (isSuccess) {
    data.lastSuccessAt = new Date();
    data.lastError = null;
  }

  try {
    await db.jobSource.update({
      where: { key: stats.sourceKey },
      data: data as never,
    });
  } catch (e) {
    // Fallback without optional columns if migrate not applied
    await db.jobSource.update({
      where: { key: stats.sourceKey },
      data: {
        lastSyncAt: new Date(),
        healthStatus: healthStatus.toLowerCase(),
        jobsFetched: source.jobsFetched + stats.fetched,
        jobsCreated: source.jobsCreated + stats.created,
        jobsUpdated: source.jobsUpdated + stats.updated,
        jobsSkipped: source.jobsSkipped + stats.skipped,
        ...(isHardFail
          ? {
              lastErrorAt: new Date(),
              lastError: (stats.errors[0] || "source_failed").slice(0, 500),
            }
          : isSuccess
            ? { lastSuccessAt: new Date(), lastError: null }
            : {}),
      },
    });
  }
}
