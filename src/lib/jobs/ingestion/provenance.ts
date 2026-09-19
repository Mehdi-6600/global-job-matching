/**
 * Canonical provenance: one Job can be listed by multiple sources.
 * Soft-no-op until JobSourceListing exists in Prisma Client (after schema + generate).
 * Employer jobs are never linked (callers only pass imported job ids).
 */
import { db } from "@/lib/db";
import type { IngestJobDraft } from "./types";

type ListingDelegate = {
  upsert: (args: {
    where: {
      sourceKey_sourceJobId: { sourceKey: string; sourceJobId: string };
    };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }) => Promise<unknown>;
};

function getListingDelegate(): ListingDelegate | null {
  const client = db as unknown as { jobSourceListing?: ListingDelegate };
  return client.jobSourceListing ?? null;
}

export async function upsertSourceListing(
  jobId: string,
  draft: IngestJobDraft,
): Promise<void> {
  const listing = getListingDelegate();
  if (!listing) {
    // Schema not migrated / client not regenerated yet.
    return;
  }

  const now = new Date();
  await listing.upsert({
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
