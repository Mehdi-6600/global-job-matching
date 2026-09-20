/**
 * Atomic per-source lease (ownership-based).
 * Acquire: CAS on expired/null leaseUntil.
 * Renew/release: only matching leaseOwner token.
 * Fail-closed on unexpected DB errors.
 */
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

const DEFAULT_LEASE_MS = 5 * 60 * 1000;

export type SourceLease = {
  sourceKey: string;
  ownerToken: string;
  leaseMs: number;
};

function newOwnerToken(): string {
  return randomBytes(16).toString("hex");
}

export async function tryAcquireSourceLease(
  sourceKey: string,
  leaseMs: number = DEFAULT_LEASE_MS,
): Promise<SourceLease | null> {
  const ownerToken = newOwnerToken();
  const now = new Date();
  const until = new Date(now.getTime() + leaseMs);

  try {
    const result = await db.jobSource.updateMany({
      where: {
        key: sourceKey,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: {
        leaseOwner: ownerToken,
        leaseUntil: until,
        lastSyncAt: now,
      },
    });
    if (result.count === 0) return null;
    return { sourceKey, ownerToken, leaseMs };
  } catch {
    /*
     * Fail-closed.
     *
     * If the atomic CAS could not be executed reliably, we MUST NOT pretend
     * to own the lease. Any fallback that returns a lease without the
     * database confirming `leaseOwner = ownerToken` would allow two workers
     * to believe they hold the same source simultaneously → double ingestion.
     *
     * Therefore: unexpected DB error ⇒ acquire fails ⇒ caller must skip.
     */
    return null;
  }
}

export async function renewSourceLease(lease: SourceLease): Promise<boolean> {
  const until = new Date(Date.now() + lease.leaseMs);
  try {
    const result = await db.jobSource.updateMany({
      where: {
        key: lease.sourceKey,
        leaseOwner: lease.ownerToken,
      },
      data: {
        leaseUntil: until,
        lastSyncAt: new Date(),
      },
    });
    /*
     * count > 0 ⇒ the database confirmed this exact ownerToken still holds
     * the lease and the new expiry was persisted.
     * count === 0 ⇒ ownership was lost (reclaimed by another worker,
     * released, or the row no longer matches) → renew MUST fail.
     */
    return result.count > 0;
  } catch {
    /*
     * Fail-closed.
     *
     * A DB error during renew means we cannot prove ownership anymore.
     * Returning `true` here would let the worker keep running with a lease
     * the database never confirmed — exactly the fail-open behavior that
     * enables duplicate ingestion. Treat any error as "not renewed".
     */
    return false;
  }
}

export async function releaseSourceLease(lease: SourceLease): Promise<boolean> {
  try {
    const result = await db.jobSource.updateMany({
      where: {
        key: lease.sourceKey,
        leaseOwner: lease.ownerToken,
      },
      data: {
        leaseOwner: null,
        leaseUntil: null,
      },
    });
    /*
     * count === 0 is a normal outcome when the lease already expired and a
     * new owner reclaimed it, or when the row was already released.
     * It is NOT an error, but the caller can use the boolean to distinguish
     * "we still owned it at release time" from "we didn't".
     */
    return result.count > 0;
  } catch {
    // Fail-closed: report failure to the caller instead of swallowing it.
    return false;
  }
}
