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
