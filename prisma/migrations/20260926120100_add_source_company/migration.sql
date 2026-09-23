-- SourceCompany — ATS provider discovery registry.
--
-- Purpose:
--   Each row records one publicly-listed ATS board that the ingestion
--   layer may consume, keyed by (provider, boardIdentifier). Discovery
--   is a separate concern from ingestion: a board can be discovered,
--   validated, and stored long before its jobs are ever fetched.
--
-- Design:
--   - The table is additive; nothing else references it.
--   - legalStatus mirrors the fail-closed pattern used by the static
--     source registry: a board is only eligible when both robotsStatus
--     and termsStatus are explicitly "allowed".
--   - status tracks the operational lifecycle (discovered → active →
--     paused/blocked) so that a single bad board can be disabled
--     without touching the provider adapter.
--
-- Safety:
--   - New table, no FK to existing data.
--   - Idempotent creation via IF NOT EXISTS.
--   - No existing data is read, moved, or mutated.

CREATE TABLE IF NOT EXISTS "SourceCompany" (
  "id"              TEXT          NOT NULL,
  "provider"        TEXT          NOT NULL,
  "boardIdentifier" TEXT          NOT NULL,
  "companyName"     TEXT          NOT NULL,
  "careersUrl"      TEXT,
  "sourceUrl"       TEXT,
  "country"         TEXT,
  "language"        TEXT,
  "legalStatus"     TEXT          NOT NULL DEFAULT 'UNKNOWN',
  "robotsStatus"    TEXT          NOT NULL DEFAULT 'unknown',
  "termsStatus"     TEXT          NOT NULL DEFAULT 'unknown',
  "status"          TEXT          NOT NULL DEFAULT 'discovered',
  "healthStatus"    TEXT          NOT NULL DEFAULT 'unknown',
  "consecutiveFailures" INTEGER   NOT NULL DEFAULT 0,
  "lastErrorAt"     TIMESTAMP(3),
  "lastError"       TEXT,
  "lastCheckedAt"   TIMESTAMP(3),
  "lastSuccessAt"   TIMESTAMP(3),
  "discoveredAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SourceCompany_pkey" PRIMARY KEY ("id")
);

-- One board per (provider, boardIdentifier). Stable identity.
CREATE UNIQUE INDEX IF NOT EXISTS "SourceCompany_provider_boardIdentifier_key"
  ON "SourceCompany"("provider", "boardIdentifier");

-- Lookup indexes for adapter runtime + admin views.
CREATE INDEX IF NOT EXISTS "SourceCompany_provider_idx"
  ON "SourceCompany"("provider");
CREATE INDEX IF NOT EXISTS "SourceCompany_status_idx"
  ON "SourceCompany"("status");
CREATE INDEX IF NOT EXISTS "SourceCompany_legalStatus_idx"
  ON "SourceCompany"("legalStatus");
CREATE INDEX IF NOT EXISTS "SourceCompany_healthStatus_idx"
  ON "SourceCompany"("healthStatus");
