/**
 * DB soft-lease so concurrent serverless workers rarely double-run the same source.
 * Not a hard distributed lock — reduces waste; uniqueness still protects data.
 */
import { db } from "@/lib/db";

const DEFAULT_LEASE_MS = 3 * 60 * 1000;

/**
 * Try to claim source for this run. Returns false if another worker holds a fresh lease.
 */
export async function tryAcquireSourceLease(
  sourceKey: string,
  leaseMs: number = DEFAULT_LEASE_MS,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - leaseMs);
  try {
    // Compare-and-set via updateMany on stale lastSyncAt
    const result = await db.jobSource.updateMany({
      where: {
        key: sourceKey,
        OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: cutoff } }],
      },
      data: { lastSyncAt: new Date() },
    });
    return result.count > 0;
  } catch {
    // If schema/DB issue, allow run (prefer progress over hard block)
    return true;
  }
}
