/**
 * ATS seeding service.
 *
 * Idempotently upserts a curated list of boards into SourceCompany.
 * Every new row is created DISABLED from a legal perspective:
 *   status       = "discovered"
 *   legalStatus  = "UNKNOWN"
 *   robotsStatus = "unknown"
 *   termsStatus  = "unknown"
 *
 * Existing rows are NEVER downgraded or upgraded by this service. If a
 * row already exists, only its non-legal metadata (companyName,
 * careersUrl, country, language, lastCheckedAt) may be refreshed. Legal
 * fields are preserved exactly as the operator set them.
 *
 * This is a hard invariant: seeding must never grant ingestion rights.
 */
import { db } from "@/lib/db";
import { logIngestionEvent } from "./log";
import { ATS_SEED_BOARDS, type SeedBoard } from "./ats-seed-boards";

export type SeedResult = {
  provider: string;
  boardIdentifier: string;
  action: "created" | "updated" | "unchanged";
  error?: string;
};

/**
 * Upsert one board. Never touches legalStatus/robotsStatus/termsStatus
 * on an existing row.
 */
async function upsertBoard(seed: SeedBoard): Promise<SeedResult> {
  const base = {
    provider: seed.provider,
    boardIdentifier: seed.boardIdentifier,
  };

  try {
    const existing = await db.sourceCompany.findUnique({
      where: { provider_boardIdentifier: base },
      select: { id: true, companyName: true, country: true, language: true },
    });

    if (!existing) {
      await db.sourceCompany.create({
        data: {
          provider: seed.provider,
          boardIdentifier: seed.boardIdentifier,
          companyName: seed.companyName,
          country: seed.country ?? null,
          language: seed.language ?? null,
          status: "discovered",
          legalStatus: "UNKNOWN",
          robotsStatus: "unknown",
          termsStatus: "unknown",
          healthStatus: "unknown",
        },
      });
      return { ...base, action: "created" };
    }

    // Existing row: only refresh safe metadata. Legal fields untouched.
    const sameMeta =
      existing.companyName === seed.companyName &&
      (existing.country ?? null) === (seed.country ?? null) &&
      (existing.language ?? null) === (seed.language ?? null);

    if (sameMeta) {
      return { ...base, action: "unchanged" };
    }

    await db.sourceCompany.update({
      where: { provider_boardIdentifier: base },
      data: {
        companyName: seed.companyName,
        country: seed.country ?? null,
        language: seed.language ?? null,
      },
    });
    return { ...base, action: "updated" };
  } catch (error) {
    return {
      ...base,
      action: "unchanged",
      error: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    };
  }
}

/**
 * Seed all boards in the static list. Idempotent, safe to re-run.
 */
export async function seedAtsBoards(): Promise<SeedResult[]> {
  const results: SeedResult[] = [];
  for (const seed of ATS_SEED_BOARDS) {
    results.push(await upsertBoard(seed));
  }
  logIngestionEvent("info", "ats_seed_complete", {
    total: results.length,
    created: results.filter((r) => r.action === "created").length,
    updated: results.filter((r) => r.action === "updated").length,
    unchanged: results.filter((r) => r.action === "unchanged").length,
    errors: results.filter((r) => Boolean(r.error)).length,
  });
  return results;
}

/**
 * Manually register one board (for cases the operator wants to add
 * without editing the static seed list). Same fail-closed defaults.
 */
export async function registerAtsBoard(
  seed: SeedBoard,
): Promise<SeedResult> {
  return upsertBoard(seed);
}

/**
 * Read-only summary for admin UIs.
 */
export async function summarizeAtsBoards(): Promise<{
  total: number;
  byProvider: Record<string, number>;
  byStatus: Record<string, number>;
  byLegalStatus: Record<string, number>;
}> {
  const rows = await db.sourceCompany.findMany({
    select: { provider: true, status: true, legalStatus: true },
  });
  const byProvider: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byLegalStatus: Record<string, number> = {};
  for (const r of rows) {
    byProvider[r.provider] = (byProvider[r.provider] ?? 0) + 1;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byLegalStatus[r.legalStatus] = (byLegalStatus[r.legalStatus] ?? 0) + 1;
  }
  return {
    total: rows.length,
    byProvider,
    byStatus,
    byLegalStatus,
  };
}
