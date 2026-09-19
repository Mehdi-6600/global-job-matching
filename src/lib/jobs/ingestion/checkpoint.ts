/**
 * Resumable sync checkpoint on JobSource.syncCursor.
 * Supports page and opaque cursor/token (adapter-agnostic).
 * FULL clears; PARTIAL resumes; corrupted payload ignored safely.
 */
import { db } from "@/lib/db";

export type SyncCheckpoint = {
  v: 1;
  page?: number;
  cursor?: string | null;
  token?: string | null;
  updatedAt: string;
};

const MAX_TOKEN_LEN = 512;

export function parseCheckpoint(
  raw: string | null | undefined,
): SyncCheckpoint | null {
  if (!raw || !raw.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const updatedAt =
      typeof o.updatedAt === "string"
        ? o.updatedAt
        : new Date().toISOString();

    let page: number | undefined;
    if (typeof o.page === "number" && Number.isFinite(o.page)) {
      page = Math.max(1, Math.floor(o.page));
    }

    let cursor: string | null | undefined;
    if (typeof o.cursor === "string") {
      cursor = o.cursor.slice(0, MAX_TOKEN_LEN);
    } else if (o.cursor === null) {
      cursor = null;
    }

    let token: string | null | undefined;
    if (typeof o.token === "string") {
      token = o.token.slice(0, MAX_TOKEN_LEN);
    }

    // Legacy { page, updatedAt } without v
    if (page == null && cursor == null && token == null) {
      return null;
    }

    return {
      v: 1,
      page,
      cursor: cursor ?? undefined,
      token: token ?? undefined,
      updatedAt,
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
  state: { page?: number; cursor?: string | null; token?: string | null },
): Promise<void> {
  const payload: SyncCheckpoint = {
    v: 1,
    page:
      state.page != null && Number.isFinite(state.page)
        ? Math.max(1, Math.floor(state.page))
        : undefined,
    cursor: state.cursor?.slice(0, MAX_TOKEN_LEN) ?? undefined,
    token: state.token?.slice(0, MAX_TOKEN_LEN) ?? undefined,
    updatedAt: new Date().toISOString(),
  };
  try {
    await db.jobSource.update({
      where: { key: sourceKey },
      data: { syncCursor: JSON.stringify(payload) },
    });
  } catch {
    // ignore if column missing
  }
}

/** @deprecated prefer saveSourceCheckpoint with object — kept for call sites */
export async function saveSourceCheckpointPage(
  sourceKey: string,
  page: number,
): Promise<void> {
  return saveSourceCheckpoint(sourceKey, { page });
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
