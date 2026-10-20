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
