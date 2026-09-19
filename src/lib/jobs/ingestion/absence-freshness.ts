/**
 * Absence-based freshness only after FULL sync. Cursor-batched — no take:2000 cap.
 * Never touches employer jobs (postedById != null).
 */
import { db } from "@/lib/db";
import {
  computeFreshnessStatus,
  mayApplyAbsenceFreshness,
} from "./freshness";
import type { SyncCompleteness } from "./types";

const BATCH = 500;

export async function applyAbsenceFreshness(options: {
  sourceKey: string;
  completeness: SyncCompleteness;
  seenExternalIds: string[];
}): Promise<{ updated: number }> {
  if (!mayApplyAbsenceFreshness(options.completeness)) {
    return { updated: 0 };
  }

  const now = new Date();
  const seen = new Set(options.seenExternalIds.filter(Boolean));
  let updated = 0;
  let cursor: string | undefined;

  for (;;) {
    const batch = await db.job.findMany({
      where: {
        postedById: null,
        source: options.sourceKey,
        status: "active",
      },
      select: { id: true, lastSeenAt: true, externalId: true },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (batch.length === 0) break;

    for (const job of batch) {
      if (job.externalId && seen.has(job.externalId)) continue;

      const status = computeFreshnessStatus(job.lastSeenAt, now);
      const normalized =
        typeof status === "string" ? status.toLowerCase() : String(status);
      if (normalized === "fresh") continue;

      const result = await db.job.updateMany({
        where: { id: job.id, postedById: null },
        data: { freshnessStatus: normalized },
      });
      updated += result.count;
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < BATCH) break;
  }

  return { updated };
}
