/**
 * Mark imported jobs as aging/stale ONLY after a FULL successful source sync.
 * Never touches employer jobs (postedById != null).
 */
import { db } from "@/lib/db";
import {
  computeFreshnessStatus,
  mayApplyAbsenceFreshness,
} from "./freshness";
import type { SyncCompleteness } from "./types";

export async function applyAbsenceFreshness(options: {
  sourceKey: string;
  completeness: SyncCompleteness;
  /** Jobs seen in this FULL run (externalId list). */
  seenExternalIds: string[];
}): Promise<{ updated: number }> {
  if (!mayApplyAbsenceFreshness(options.completeness)) {
    return { updated: 0 };
  }

  const now = new Date();
  // Candidates: imported jobs from this source, not seen this run
  const candidates = await db.job.findMany({
    where: {
      postedById: null,
      source: options.sourceKey,
      status: "active",
      externalId: {
        notIn:
          options.seenExternalIds.length > 0
            ? options.seenExternalIds
            : ["__none__"],
      },
    },
    select: { id: true, lastSeenAt: true },
    take: 2000,
  });

  let updated = 0;
  for (const job of candidates) {
    const status = computeFreshnessStatus(job.lastSeenAt, now);
    if (status === "fresh") continue;
    await db.job.updateMany({
      where: { id: job.id, postedById: null },
      data: { freshnessStatus: status },
    });
    updated += 1;
  }
  return { updated };
}
