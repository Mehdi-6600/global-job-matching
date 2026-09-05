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
