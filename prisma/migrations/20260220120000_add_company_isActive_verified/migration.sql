-- Add isActive and verified flags to Company.
-- Both columns are additive with safe defaults:
--   - isActive = true   → all existing companies stay enabled
--   - verified = false  → all existing companies remain unverified (admin approval)
-- No data is modified or deleted.
--
-- Legacy incremental migration (pre-baseline). Safe on an empty database:
-- it only runs if Company exists. On a fresh database the columns and
-- indexes are provided by 20260902090100_baseline_schema_completion.

DO $$
BEGIN
  IF to_regclass('public."Company"') IS NOT NULL THEN
    ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS "Company_isActive_idx" ON "Company"("isActive");
    CREATE INDEX IF NOT EXISTS "Company_verified_idx" ON "Company"("verified");
  END IF;
END $$;
