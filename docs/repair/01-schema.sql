-- ============================================================================
-- 01 — schema repair for production (2026-10-20)
--
-- RUN THIS FIRST, then 02-migration-history.sql.
--
-- WHY: production is 17 migrations behind prisma/schema.prisma.
-- Queries that read Job rows fail with "column does not exist", so
-- GET /api/jobs returns 500 and /jobs shows "Could not load jobs".
--
-- WHAT IT DOES: replays the pending migrations in order. Every statement is
-- idempotent (IF NOT EXISTS / guarded DO blocks), so re-running the file is
-- safe and nothing is destroyed.
--
-- WHAT IT DOES NOT DO: the schema diff also proposes 12 DROP COLUMN and
-- 1 DROP TABLE statements. Those are old leftovers, they are NOT needed, and
-- they are deliberately absent here. This file contains no DROP, DELETE or
-- TRUNCATE of data.
--
-- WHERE: the production Postgres SQL editor (Neon / Supabase / Vercel Postgres
-- all have one). Take a backup first if the provider offers it.
--
-- ONLY the schema: migration bookkeeping is in 02, so if something fails here
-- the history is not marked as applied by mistake.
-- ============================================================================


-- --------------------------------------------------------------------------
-- migration: 20260902090100_baseline_schema_completion
-- --------------------------------------------------------------------------
-- Completes the production baseline for FRESH databases.
--
-- Why this exists:
--   * The pre-baseline migrations 20260220120000 (Company.isActive/verified) and
--     20260318120000 (Job ingestion columns) are guarded so they skip when their
--     table does not exist yet. On an empty database the baseline then creates
--     Company/Job without those columns.
--   * Several objects in prisma/schema.prisma were never created by any
--     migration in this history (for example the PaymentIntent table and the
--     Transaction payment columns). They were presumably added to older
--     databases by a schema push.
--
-- Safety:
--   * No DROP and no data rewrite.
--   * Two UNIQUE indexes are created on tables that may already hold rows in an
--     older database: Transaction("paymentIntentId") and
--     PaymentIntent("transactionId"). Both match @unique in prisma/schema.prisma.
--     On a populated database the index creation FAILS if two non-NULL rows share
--     a value. Run the read-only duplicate check in docs/MIGRATION_STRATEGY.md
--     before deploying. The Interview(userId, jobId) unique index is NOT added here.
--   * Every statement is idempotent (IF [NOT] EXISTS or a pg_constraint guard).
--     On a database where these objects already exist, this migration is a no-op.

-- ---------------------------------------------------------------------------
-- Company / Job / User / Application / Interview / JobAlert / Notification / Message
-- ---------------------------------------------------------------------------

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Company_isActive_idx" ON "Company"("isActive");
CREATE INDEX IF NOT EXISTS "Company_verified_idx" ON "Company"("verified");

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "source" TEXT;
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
CREATE INDEX IF NOT EXISTS "Job_externalId_idx" ON "Job"("externalId");
CREATE INDEX IF NOT EXISTS "Job_source_idx" ON "Job"("source");
CREATE INDEX IF NOT EXISTS "Job_freshnessStatus_idx" ON "Job"("freshnessStatus");
CREATE INDEX IF NOT EXISTS "Job_externalId_source_idx" ON "Job"("externalId", "source");

CREATE INDEX IF NOT EXISTS "User_plan_idx" ON "User"("plan");

ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "resumeUrl" TEXT;

ALTER TABLE "Interview" ADD COLUMN IF NOT EXISTS "applicationId" TEXT;

ALTER TABLE "JobAlert" ADD COLUMN IF NOT EXISTS "frequency" TEXT NOT NULL DEFAULT 'daily';
CREATE INDEX IF NOT EXISTS "JobAlert_active_idx" ON "JobAlert"("active");

CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt");

-- ---------------------------------------------------------------------------
-- Crypto payments: Transaction columns + PaymentIntent
-- ---------------------------------------------------------------------------

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "paymentIntentId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "recipientAddress" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "expectedCryptoAmount" DECIMAL(24,12);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "rateUsd" DECIMAL(18,8);
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_paymentIntentId_key" ON "Transaction"("paymentIntentId");
CREATE INDEX IF NOT EXISTS "Transaction_paymentIntentId_idx" ON "Transaction"("paymentIntentId");

CREATE TABLE IF NOT EXISTS "PaymentIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "amountUsd" DECIMAL(12,2) NOT NULL,
    "cryptoType" TEXT NOT NULL,
    "rateUsd" DECIMAL(18,8) NOT NULL,
    "rateSource" TEXT NOT NULL,
    "rateFetchedAt" TIMESTAMP(3) NOT NULL,
    "expectedCryptoAmount" DECIMAL(24,12) NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_transactionId_key" ON "PaymentIntent"("transactionId");
CREATE INDEX IF NOT EXISTS "PaymentIntent_userId_status_idx" ON "PaymentIntent"("userId", "status");
CREATE INDEX IF NOT EXISTS "PaymentIntent_expiresAt_idx" ON "PaymentIntent"("expiresAt");
CREATE INDEX IF NOT EXISTS "PaymentIntent_status_idx" ON "PaymentIntent"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentIntent_userId_fkey') THEN
    ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentIntent_transactionId_fkey') THEN
    ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_transactionId_fkey"
      FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


-- --------------------------------------------------------------------------
-- migration: 20260904000000_fix_schema_mismatch
-- --------------------------------------------------------------------------
-- ============================================================
-- Forward-only migration: Add missing columns from Prisma Schema
-- that were not included in the baseline migration.
-- These columns exist in schema.prisma but not in baseline SQL.
-- ============================================================

-- User table: planStartedAt, planExpiresAt, billingCycle
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planStartedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT;

-- Transaction table: billingCycle
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT;

-- Add missing index from schema
CREATE INDEX IF NOT EXISTS "User_planExpiresAt_idx" ON "User"("planExpiresAt");


-- --------------------------------------------------------------------------
-- migration: 20260904000001_add_session_version
-- --------------------------------------------------------------------------
-- ============================================================
-- Add sessionVersion to User for secure session invalidation.
-- When password/role/email changes, incrementing this version
-- invalidates all existing JWT sessions.
-- ============================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "User_sessionVersion_idx" ON "User"("sessionVersion");


-- --------------------------------------------------------------------------
-- migration: 20260904000002_decimal_amount
-- --------------------------------------------------------------------------
-- ============================================================
-- Convert Transaction.amount from DOUBLE PRECISION to Decimal(10,2)
-- for safe monetary calculations.
-- ============================================================

ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE DECIMAL(10,2) USING "amount"::DECIMAL(10,2);


-- --------------------------------------------------------------------------
-- migration: 20260905120000_ensure_integrity
-- --------------------------------------------------------------------------
-- ============================================================
-- Forward-only integrity migration.
-- Ensures columns/indexes required by current schema.prisma
-- exist on both legacy and baseline databases.
-- Fully idempotent.
-- ============================================================

-- User plan + session fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planStartedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "User_planExpiresAt_idx" ON "User"("planExpiresAt");
CREATE INDEX IF NOT EXISTS "User_sessionVersion_idx" ON "User"("sessionVersion");

-- Transaction money + billing
DO $$
BEGIN
  IF to_regclass('public."Transaction"') IS NOT NULL THEN
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "cryptoType" TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "txHash" TEXT;
    -- amount → Decimal when still double precision
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Transaction'
        AND column_name = 'amount'
        AND data_type IN ('double precision', 'real')
    ) THEN
      ALTER TABLE "Transaction"
        ALTER COLUMN "amount" TYPE DECIMAL(10,2)
        USING "amount"::DECIMAL(10,2);
    END IF;
  END IF;
END $$;

-- JobAlert.updatedAt
DO $$
BEGIN
  IF to_regclass('public."JobAlert"') IS NOT NULL THEN
    ALTER TABLE "JobAlert"
      ADD COLUMN IF NOT EXISTS "updatedAt"
      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Application unique (idempotent)
DO $$
BEGIN
  IF to_regclass('public."Application"') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "Application_userId_jobId_key"
      ON "Application"("userId", "jobId");
  END IF;
END $$;

-- AnalyticsEvent (required by /api/analytics)
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "userId" TEXT,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_path_idx" ON "AnalyticsEvent"("path");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");


-- --------------------------------------------------------------------------
-- migration: 20260905140000_usage_event
-- --------------------------------------------------------------------------
-- UsageEvent ledger for AI and other quota accounting (not Notification)

CREATE TABLE IF NOT EXISTS "UsageEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "periodKey" TEXT,
  "meta" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UsageEvent_userId_idx" ON "UsageEvent"("userId");
CREATE INDEX IF NOT EXISTS "UsageEvent_userId_kind_createdAt_idx"
  ON "UsageEvent"("userId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "UsageEvent_userId_kind_periodKey_idx"
  ON "UsageEvent"("userId", "kind", "periodKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UsageEvent_userId_fkey'
  ) THEN
    ALTER TABLE "UsageEvent"
      ADD CONSTRAINT "UsageEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


-- --------------------------------------------------------------------------
-- migration: 20260906180000_career_risk_assessment
-- --------------------------------------------------------------------------
-- CreateTable CareerRiskAssessment (idempotent-ish)
CREATE TABLE IF NOT EXISTS "CareerRiskAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "skills" TEXT,
    "industry" TEXT,
    "experienceYears" INTEGER,
    "country" TEXT,
    "location" TEXT,
    "education" TEXT,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "skillsToBuild" JSONB NOT NULL,
    "alternatives" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "paidSnapshot" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CareerRiskAssessment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CareerRiskAssessment_shareToken_key" ON "CareerRiskAssessment"("shareToken");
CREATE INDEX IF NOT EXISTS "CareerRiskAssessment_userId_createdAt_idx" ON "CareerRiskAssessment"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CareerRiskAssessment_shareToken_idx" ON "CareerRiskAssessment"("shareToken");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CareerRiskAssessment_userId_fkey'
  ) THEN
    ALTER TABLE "CareerRiskAssessment"
      ADD CONSTRAINT "CareerRiskAssessment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


-- --------------------------------------------------------------------------
-- migration: 20260910160000_transaction_amount_decimal_12_2
-- --------------------------------------------------------------------------
-- Align Transaction.amount with schema.prisma: Decimal(12, 2)
-- Previous migration set DECIMAL(10, 2). Widening is safe (no data loss).

ALTER TABLE "Transaction"
  ALTER COLUMN "amount" TYPE DECIMAL(12,2)
  USING "amount"::DECIMAL(12,2);


-- --------------------------------------------------------------------------
-- migration: 20260915120000_job_search_indexes
-- --------------------------------------------------------------------------
-- Job search / filter indexes
CREATE INDEX IF NOT EXISTS "Job_location_idx" ON "Job"("location");
CREATE INDEX IF NOT EXISTS "Job_remote_idx" ON "Job"("remote");
CREATE INDEX IF NOT EXISTS "Job_type_idx" ON "Job"("type");
CREATE INDEX IF NOT EXISTS "Job_experience_idx" ON "Job"("experience");
CREATE INDEX IF NOT EXISTS "Job_salaryMin_idx" ON "Job"("salaryMin");
CREATE INDEX IF NOT EXISTS "Job_salaryMax_idx" ON "Job"("salaryMax");
CREATE INDEX IF NOT EXISTS "Job_status_createdAt_idx" ON "Job"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Job_status_remote_createdAt_idx" ON "Job"("status", "remote", "createdAt");

-- Array containment (tags has) — GIN is efficient for PostgreSQL text[]
CREATE INDEX IF NOT EXISTS "Job_tags_gin_idx" ON "Job" USING GIN ("tags");

-- Company location filter
CREATE INDEX IF NOT EXISTS "Company_location_idx" ON "Company"("location");

-- Application list by user + status
CREATE INDEX IF NOT EXISTS "Application_userId_status_idx" ON "Application"("userId", "status");


-- --------------------------------------------------------------------------
-- migration: 20260919120000_ingestion_health_listing
-- --------------------------------------------------------------------------
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


-- --------------------------------------------------------------------------
-- migration: 20260919180000_ingestion_hardening
-- --------------------------------------------------------------------------
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


-- --------------------------------------------------------------------------
-- migration: 20260920010000_source_lease
-- --------------------------------------------------------------------------
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "leaseOwner" TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "leaseUntil" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "JobSource_leaseUntil_idx" ON "JobSource"("leaseUntil");


-- --------------------------------------------------------------------------
-- migration: 20260926120000_add_company_external_identity
-- --------------------------------------------------------------------------
-- Add provider-aware external identity to Company.
--
-- Purpose:
--   ATS providers (Greenhouse, Lever, Ashby) publish job boards keyed by
--   (provider, boardIdentifier), e.g. ("greenhouse", "stripe"). We persist
--   that mapping on Company so ingestion can resolve a single company row
--   per (provider, board) without fuzzy-merging unrelated companies by
--   name.
--
-- Safety:
--   - Both columns are nullable. Existing rows are unaffected.
--   - The unique index is partial: only rows with a non-null provider
--     participate, so employer-owned companies (ownerId IS NOT NULL) and
--     legacy imported companies remain free of the constraint until they
--     are explicitly linked.
--   - No data is modified or deleted.
--   - No existing column is altered.

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "externalProvider" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "externalBoardId" TEXT;

-- One company per (provider, board). Partial unique so NULL pairs are
-- excluded and multiple employer-created companies can coexist.
CREATE UNIQUE INDEX IF NOT EXISTS "Company_externalProvider_externalBoardId_uidx"
  ON "Company"("externalProvider", "externalBoardId")
  WHERE "externalProvider" IS NOT NULL
    AND "externalBoardId" IS NOT NULL;

-- Fast lookup during ingestion: resolve a Company by (provider, board).
CREATE INDEX IF NOT EXISTS "Company_externalProvider_idx"
  ON "Company"("externalProvider");


-- --------------------------------------------------------------------------
-- migration: 20260926120100_add_source_company
-- --------------------------------------------------------------------------
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


-- --------------------------------------------------------------------------
-- migration: 20261019030000_add_outreach_attempt
-- --------------------------------------------------------------------------
-- OutreachAttempt — persistent 7-day dedup for employer outreach cron
-- Guarantees at most one outreach per company per 7-day window even under concurrent cron runs.
-- Uses unique windowKey = companyKey:windowStart (UTC, 7-day bucket since epoch)

CREATE TABLE IF NOT EXISTS "OutreachAttempt" (
  "id"                TEXT NOT NULL,
  "companyId"         TEXT,
  "companyKey"        TEXT NOT NULL,
  "companyName"       TEXT NOT NULL,
  "email"             TEXT,
  "status"            TEXT NOT NULL DEFAULT 'pending',
  "windowKey"         TEXT NOT NULL,
  "providerMessageId" TEXT,
  "error"             TEXT,
  "sentAt"            TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutreachAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutreachAttempt_windowKey_key" ON "OutreachAttempt"("windowKey");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_companyKey_idx" ON "OutreachAttempt"("companyKey");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_companyId_idx" ON "OutreachAttempt"("companyId");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_status_idx" ON "OutreachAttempt"("status");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_createdAt_idx" ON "OutreachAttempt"("createdAt");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_windowKey_idx" ON "OutreachAttempt"("windowKey");

-- FK optional (SET NULL on delete) — additive, safe
DO $$ BEGIN
  ALTER TABLE "OutreachAttempt" ADD CONSTRAINT "OutreachAttempt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- --------------------------------------------------------------------------
-- migration: 20261020020000_add_featured
-- --------------------------------------------------------------------------
-- Add missing featured columns to Job (drift fix)
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "featuredUntil" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "featuredTxId" TEXT;


-- --------------------------------------------------------------------------
-- migration: 20261020030000_add_payment_intent_links
-- --------------------------------------------------------------------------
-- featured-job links: schema.prisma declares these columns but no migration
-- ever created them, so `prisma migrate diff` reported permanent drift and the
-- columns were missing in production.
--
-- PaymentIntent.jobId / Transaction.jobId tie a crypto purchase to the job it
-- promotes; featuredDuration records the purchased duration.
--
-- Guarded and idempotent: safe to run against a database that already has some
-- of these columns.

ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "featuredDuration" TEXT;

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "featuredDuration" TEXT;

DO $$
BEGIN
  ALTER TABLE "PaymentIntent"
    ADD CONSTRAINT "PaymentIntent_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "PaymentIntent_jobId_idx" ON "PaymentIntent"("jobId");
CREATE INDEX IF NOT EXISTS "Transaction_jobId_idx" ON "Transaction"("jobId");
