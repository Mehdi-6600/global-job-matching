-- Additive Job Ingestion Network foundation
-- Backward-compatible: no destructive changes to existing Job rows.

CREATE TABLE IF NOT EXISTS "JobSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'aggregator',
    "baseUrl" TEXT,
    "apiUrl" TEXT,
    "licenseStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "commercialAllowed" BOOLEAN NOT NULL DEFAULT false,
    "redistributionAllowed" BOOLEAN NOT NULL DEFAULT false,
    "attributionRequired" BOOLEAN NOT NULL DEFAULT true,
    "canonicalApplyRequired" BOOLEAN NOT NULL DEFAULT true,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportedOccupations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "refreshIntervalMinutes" INTEGER NOT NULL DEFAULT 1440,
    "rateLimitPerMinute" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "jobsFetched" INTEGER NOT NULL DEFAULT 0,
    "jobsCreated" INTEGER NOT NULL DEFAULT 0,
    "jobsUpdated" INTEGER NOT NULL DEFAULT 0,
    "jobsSkipped" INTEGER NOT NULL DEFAULT 0,
    "duplicateRate" DOUBLE PRECISION,
    "staleRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobSource_key_key" ON "JobSource"("key");
CREATE INDEX IF NOT EXISTS "JobSource_enabled_idx" ON "JobSource"("enabled");
CREATE INDEX IF NOT EXISTS "JobSource_licenseStatus_idx" ON "JobSource"("licenseStatus");

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "applyUrl" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "firstSeenAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "lastVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "freshnessStatus" TEXT DEFAULT 'fresh';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "occupation" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "occupationFamily" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "seniority" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "descriptionIsSnippet" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "qualityScore" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "attribution" TEXT;

CREATE INDEX IF NOT EXISTS "Job_source_idx" ON "Job"("source");
CREATE INDEX IF NOT EXISTS "Job_freshnessStatus_idx" ON "Job"("freshnessStatus");
CREATE INDEX IF NOT EXISTS "Job_externalId_source_idx" ON "Job"("externalId", "source");
