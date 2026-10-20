-- JobSource — ingestion source registry (health, licensing, leases).
--
-- schema.prisma declares this model and several migrations reference it, but
-- only inside guarded blocks (`IF to_regclass('public."JobSource"') IS NOT
-- NULL`). On a database where the table was never created those blocks silently
-- skip, so the table stayed missing and every JobSource query failed.
--
-- Idempotent: create when absent, then add any column the table might lack
-- (a partial earlier creation is possible on long-lived databases).

CREATE TABLE IF NOT EXISTS "JobSource" (
  "id"                     TEXT NOT NULL,
  "key"                    TEXT NOT NULL,
  "name"                   TEXT NOT NULL,
  "type"                   TEXT NOT NULL DEFAULT 'aggregator',
  "baseUrl"                TEXT,
  "apiUrl"                 TEXT,
  "licenseStatus"          TEXT NOT NULL DEFAULT 'UNKNOWN',
  "commercialAllowed"      BOOLEAN NOT NULL DEFAULT false,
  "redistributionAllowed"  BOOLEAN NOT NULL DEFAULT false,
  "attributionRequired"    BOOLEAN NOT NULL DEFAULT true,
  "canonicalApplyRequired" BOOLEAN NOT NULL DEFAULT true,
  "countries"              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "supportedOccupations"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "refreshIntervalMinutes" INTEGER NOT NULL DEFAULT 1440,
  "rateLimitPerMinute"     INTEGER,
  "enabled"                BOOLEAN NOT NULL DEFAULT false,
  "healthStatus"           TEXT NOT NULL DEFAULT 'unknown',
  "qualityScore"           DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "lastSyncAt"             TIMESTAMP(3),
  "lastSuccessAt"          TIMESTAMP(3),
  "lastErrorAt"            TIMESTAMP(3),
  "lastError"              TEXT,
  "jobsFetched"            INTEGER NOT NULL DEFAULT 0,
  "jobsCreated"            INTEGER NOT NULL DEFAULT 0,
  "jobsUpdated"            INTEGER NOT NULL DEFAULT 0,
  "jobsSkipped"            INTEGER NOT NULL DEFAULT 0,
  "duplicateRate"          DOUBLE PRECISION,
  "staleRate"              DOUBLE PRECISION,
  "consecutiveFailures"    INTEGER NOT NULL DEFAULT 0,
  "lastSyncStatus"         TEXT,
  "syncCursor"             TEXT,
  "leaseOwner"             TEXT,
  "leaseUntil"             TIMESTAMP(3),
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "key"                    TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "name"                   TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "type"                   TEXT NOT NULL DEFAULT 'aggregator';
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "baseUrl"                TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "apiUrl"                 TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "licenseStatus"          TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "commercialAllowed"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "redistributionAllowed"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "attributionRequired"    BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "canonicalApplyRequired" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "countries"              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "supportedOccupations"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "refreshIntervalMinutes" INTEGER NOT NULL DEFAULT 1440;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "rateLimitPerMinute"     INTEGER;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "enabled"                BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "healthStatus"           TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "qualityScore"           DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "lastSyncAt"             TIMESTAMP(3);
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "lastSuccessAt"          TIMESTAMP(3);
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "lastErrorAt"            TIMESTAMP(3);
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "lastError"              TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "jobsFetched"            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "jobsCreated"            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "jobsUpdated"            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "jobsSkipped"            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "duplicateRate"          DOUBLE PRECISION;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "staleRate"              DOUBLE PRECISION;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "consecutiveFailures"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "lastSyncStatus"         TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "syncCursor"             TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "leaseOwner"             TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "leaseUntil"             TIMESTAMP(3);
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- temporary default so an existing row can be backfilled; Prisma always writes this itself
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "JobSource" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "JobSource_key_key" ON "JobSource"("key");
CREATE INDEX IF NOT EXISTS "JobSource_enabled_idx" ON "JobSource"("enabled");
CREATE INDEX IF NOT EXISTS "JobSource_licenseStatus_idx" ON "JobSource"("licenseStatus");
CREATE INDEX IF NOT EXISTS "JobSource_leaseUntil_idx" ON "JobSource"("leaseUntil");
