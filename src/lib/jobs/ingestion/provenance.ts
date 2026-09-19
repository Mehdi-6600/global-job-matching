/**
 * Canonical provenance: one Job can be listed by multiple sources.
 * Employer jobs (postedById != null) are never linked here by design —
 * callers only pass jobIds produced by imported-job create/update paths.
 */
import { db } from "@/lib/db";
import type { IngestJobDraft } from "./types";

export async function upsertSourceListing(
  jobId: string,
  draft: IngestJobDraft,
): Promise<void> {
  const now = new Date();
  await db.jobSourceListing.upsert({
    where: {
      sourceKey_sourceJobId: {
        sourceKey: draft.sourceKey,
        sourceJobId: draft.sourceJobId,
      },
    },
    create: {
      jobId,
      sourceKey: draft.sourceKey,
      sourceJobId: draft.sourceJobId,
      externalId: draft.externalId,
      sourceUrl: draft.externalUrl,
      applyUrl: draft.applyUrl,
      firstSeenAt: now,
      lastSeenAt: now,
      lastVerifiedAt: now,
      sourceUpdatedAt: draft.sourceUpdatedAt ?? null,
    },
    update: {
      jobId,
      externalId: draft.externalId,
      sourceUrl: draft.externalUrl,
      applyUrl: draft.applyUrl,
      lastSeenAt: now,
      lastVerifiedAt: now,
      sourceUpdatedAt: draft.sourceUpdatedAt ?? null,
    },
  });
}
