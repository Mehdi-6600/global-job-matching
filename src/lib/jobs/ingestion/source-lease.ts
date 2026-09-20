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
    try {
      const cutoff = new Date(Date.now() - leaseMs);
      const result = await db.jobSource.updateMany({
        where: {
          key: sourceKey,
          OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: cutoff } }],
        },
        data: { lastSyncAt: new Date() },
      });
      if (result.count === 0) return null;
      return { sourceKey, ownerToken, leaseMs };
    } catch {
      return null;
    }
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
    return result.count > 0;
  } catch {
    try {
      await db.jobSource.updateMany({
        where: { key: lease.sourceKey },
        data: { lastSyncAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }
}

export async function releaseSourceLease(lease: SourceLease): Promise<void> {
  try {
    await db.jobSource.updateMany({
      where: {
        key: lease.sourceKey,
        leaseOwner: lease.ownerToken,
      },
      data: {
        leaseOwner: null,
        leaseUntil: null,
      },
    });
  } catch {
    // ignore
  }
}
