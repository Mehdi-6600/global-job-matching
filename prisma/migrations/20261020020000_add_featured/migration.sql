-- Add missing featured columns to Job (drift fix)
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "featuredUntil" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "featuredTxId" TEXT;
