ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "consecutiveFailures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "lastSyncStatus" TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "syncCursor" TEXT;

CREATE TABLE IF NOT EXISTS "JobSourceListing" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "sourceJobId" TEXT NOT NULL,
  "externalId" TEXT,
  "sourceUrl" TEXT,
  "applyUrl" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastVerifiedAt" TIMESTAMP(3),
  "sourceUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobSourceListing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobSourceListing_sourceKey_sourceJobId_key"
  ON "JobSourceListing"("sourceKey", "sourceJobId");
CREATE INDEX IF NOT EXISTS "JobSourceListing_jobId_idx" ON "JobSourceListing"("jobId");
CREATE INDEX IF NOT EXISTS "JobSourceListing_sourceKey_idx" ON "JobSourceListing"("sourceKey");
CREATE INDEX IF NOT EXISTS "JobSourceListing_externalId_idx" ON "JobSourceListing"("externalId");
CREATE INDEX IF NOT EXISTS "JobSourceListing_lastSeenAt_idx" ON "JobSourceListing"("lastSeenAt");

DO $$ BEGIN
  ALTER TABLE "JobSourceListing"
    ADD CONSTRAINT "JobSourceListing_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
