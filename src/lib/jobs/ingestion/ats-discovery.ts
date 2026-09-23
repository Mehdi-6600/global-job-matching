/**
 * ATS discovery helpers.
 *
 * Discovery is intentionally separate from ingestion:
 *   - The ingestion pipeline consumes published jobs.
 *   - Discovery records which companies / boards exist, and lets a
 *     human mark them legally eligible before the adapter fetches them.
 *
 * This module owns:
 *   - Reading eligible boards from the SourceCompany table.
 *   - Recording health / failures of individual boards.
 *
 * It does NOT touch Company or Job. Company linkage happens in the
 * pipeline via resolveCompany(), and Job persistence is unchanged.
 */
import { db } from "@/lib/db";
import { logIngestionEvent } from "./log";

export type AtsProvider = "greenhouse" | "lever" | "ashby";

export type EligibleBoard = {
  provider: AtsProvider;
  boardIdentifier: string;
  companyName: string;
};

/**
 * The fail-closed legal gate at the board level.
 *
 * A board is only eligible when ALL of these hold:
 *   - status = "active"
 *   - legalStatus = "APPROVED"
 *   - robotsStatus = "allowed"
 *   - termsStatus = "allowed"
 *
 * This mirrors the source registry semantics but is scoped to a single
 * board so a bad board can be disabled without touching the provider
 * entry in the static registry.
 */
export async function getEligibleBoards(
  provider: AtsProvider,
  limit = 500,
): Promise<EligibleBoard[]> {
  try {
    const rows = await db.sourceCompany.findMany({
      where: {
        provider,
        status: "active",
        legalStatus: "APPROVED",
        robotsStatus: "allowed",
        termsStatus: "allowed",
      },
      select: {
        provider: true,
        boardIdentifier: true,
        companyName: true,
      },
      orderBy: [{ updatedAt: "asc" }],
      take: Math.max(1, Math.min(limit, 2000)),
    });
    return rows.map((r) => ({
      provider: r.provider as AtsProvider,
      boardIdentifier: r.boardIdentifier,
      companyName: r.companyName,
    }));
  } catch (error) {
    logIngestionEvent("error", "ats_discovery_read_failed", {
      provider,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Record one board-level check. Best-effort; never throws.
 *
 * On success: reset consecutiveFailures, stamp lastSuccessAt.
 * On failure: increment consecutiveFailures, stamp lastErrorAt + lastError.
 */
export async function recordBoardCheck(
  provider: AtsProvider,
  boardIdentifier: string,
  result: { ok: true } | { ok: false; error: string },
): Promise<void> {
  const now = new Date();
  try {
    if (result.ok) {
      await db.sourceCompany.update({
        where: {
          provider_boardIdentifier: {
            provider,
            boardIdentifier,
          },
        },
        data: {
          consecutiveFailures: 0,
          lastErrorAt: null,
          lastError: null,
          lastCheckedAt: now,
          lastSuccessAt: now,
          healthStatus: "healthy",
        },
      });
      return;
    }

    // Failure path: increment counter, store a truncated error string.
    const row = await db.sourceCompany.findUnique({
      where: {
        provider_boardIdentifier: { provider, boardIdentifier },
      },
      select: { consecutiveFailures: true },
    });
    const next = (row?.consecutiveFailures ?? 0) + 1;
    const healthStatus = next >= 3 ? "failing" : next >= 1 ? "degraded" : "unknown";

    await db.sourceCompany.update({
      where: {
        provider_boardIdentifier: { provider, boardIdentifier },
      },
      data: {
        consecutiveFailures: next,
        lastErrorAt: now,
        lastError: result.error.slice(0, 500),
        lastCheckedAt: now,
        healthStatus,
      },
    });
  } catch (error) {
    logIngestionEvent("warn", "ats_discovery_write_failed", {
      provider,
      boardIdentifier,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Normalize a company name for potential future use (slug/canonical
 * lookups). Intentionally simple: no fuzzy matching. If you ever need
 * cross-provider company identity, do it explicitly, never implicitly.
 */
export function normalizeAtsCompanyName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 200);
}
