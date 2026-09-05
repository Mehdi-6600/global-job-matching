-- ============================================================
-- Legacy incremental migration (pre-baseline).
-- Safe no-op when Company table does not exist yet.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public."Company"') IS NOT NULL THEN
    ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
    CREATE INDEX IF NOT EXISTS "Company_ownerId_idx" ON "Company"("ownerId");
  END IF;
END $$;
