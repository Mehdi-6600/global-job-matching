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
