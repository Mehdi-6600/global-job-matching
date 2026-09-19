/**
 * Per-source resumable sync checkpoint stored on JobSource.syncCursor.
 * Format: {"page":number,"updatedAt":string}
 * Only PARTIAL runs leave a cursor; FULL clears it.
 * Resume never skips jobs already on earlier pages (idempotent persist).
 */
import { db } from "@/lib/db";

export type SyncCheckpoint = {
  page: number;
  updatedAt: string;
};

export function parseCheckpoint(raw: string | null | undefined): SyncCheckpoint | null {
  if (!raw || !raw.trim()) return null;
  try {
    const o = JSON.parse(raw) as { page?: unknown; updatedAt?: unknown };
    const page = typeof o.page === "number" ? Math.floor(o.page) : NaN;
    if (!Number.isFinite(page) || page < 1) return null;
    return {
      page,
      updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function loadSourceCheckpoint(
  sourceKey: string,
): Promise<SyncCheckpoint | null> {
  try {
    const row = await db.jobSource.findUnique({
      where: { key: sourceKey },
      select: { syncCursor: true, lastSyncStatus: true },
    });
    if (!row) return null;
    // Only resume after PARTIAL; FULL/FAILED start clean
    if (row.lastSyncStatus && row.lastSyncStatus !== "PARTIAL") {
      return null;
    }
    return parseCheckpoint(row.syncCursor);
  } catch {
    return null;
  }
}

export async function saveSourceCheckpoint(
  sourceKey: string,
  page: number,
): Promise<void> {
  const payload = JSON.stringify({
    page: Math.max(1, Math.floor(page)),
    updatedAt: new Date().toISOString(),
  } satisfies SyncCheckpoint);
  try {
    await db.jobSource.update({
      where: { key: sourceKey },
      data: { syncCursor: payload },
    });
  } catch {
    // column may be missing before migrate — ignore
  }
}

export async function clearSourceCheckpoint(sourceKey: string): Promise<void> {
  try {
    await db.jobSource.update({
      where: { key: sourceKey },
      data: { syncCursor: null },
    });
  } catch {
    // ignore
  }
}
