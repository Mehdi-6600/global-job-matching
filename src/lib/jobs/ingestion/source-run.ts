/**
 * Persist per-source run metrics onto JobSource (health + counters).
 * Uses only columns that already exist on JobSource in production schema.
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

  // Approximate consecutive failures without a dedicated column:
  // escalate if previous run also failed (lastError still set).
  let consecutiveFailures = 0;
  if (isHardFail) {
    consecutiveFailures = source.lastError ? 3 : 1;
  }

  const healthStatus = computeHealthStatus({
    enabled: source.enabled,
    consecutiveFailures,
    fetched: stats.fetched,
    failed: stats.failed,
    timedOut: stats.timedOut,
    lastError: stats.errors[0] ?? null,
  });

  const data: {
    lastSyncAt: Date;
    healthStatus: string;
    jobsFetched: number;
    jobsCreated: number;
    jobsUpdated: number;
    jobsSkipped: number;
    lastErrorAt?: Date | null;
    lastError?: string | null;
    lastSuccessAt?: Date | null;
  } = {
    lastSyncAt: new Date(),
    healthStatus: healthStatus.toLowerCase(),
    jobsFetched: source.jobsFetched + stats.fetched,
    jobsCreated: source.jobsCreated + stats.created,
    jobsUpdated: source.jobsUpdated + stats.updated,
    jobsSkipped: source.jobsSkipped + stats.skipped,
  };

  if (isHardFail) {
    data.lastErrorAt = new Date();
    data.lastError = (stats.errors[0] || "source_failed").slice(0, 500);
  } else if (
    stats.completeness === "FULL" ||
    stats.created + stats.updated > 0 ||
    stats.fetched > 0
  ) {
    data.lastSuccessAt = new Date();
    data.lastError = null;
  }

  await db.jobSource.update({
    where: { key: stats.sourceKey },
    data,
  });
}
