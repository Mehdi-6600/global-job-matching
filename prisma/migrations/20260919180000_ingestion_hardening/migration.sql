-- Ingestion hardening indexes + partial unique for concurrent safety
-- Safe for imported jobs only (postedById IS NULL)

CREATE INDEX IF NOT EXISTS "Job_applyUrl_idx" ON "Job"("applyUrl");
CREATE INDEX IF NOT EXISTS "Job_externalUrl_idx" ON "Job"("externalUrl");
CREATE INDEX IF NOT EXISTS "Job_lastSeenAt_idx" ON "Job"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "Job_source_status_idx" ON "Job"("source", "status");
CREATE INDEX IF NOT EXISTS "Job_source_lastSeenAt_idx" ON "Job"("source", "lastSeenAt");

-- Concurrent duplicate guard for namespaced external identities
CREATE UNIQUE INDEX IF NOT EXISTS "Job_source_externalId_imported_uidx"
  ON "Job"("source", "externalId")
  WHERE "postedById" IS NULL
    AND "externalId" IS NOT NULL
    AND "source" IS NOT NULL;

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
CREATE INDEX IF NOT EXISTS "Job_contentHash_idx" ON "Job"("contentHash");
