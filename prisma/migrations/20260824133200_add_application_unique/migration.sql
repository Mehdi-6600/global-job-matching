-- ============================================================
-- Legacy incremental migration (pre-baseline).
-- Made safe for empty databases: only runs if Application exists.
-- Full schema is owned by 20260902090000_production_baseline.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public."Application"') IS NOT NULL THEN
    DROP INDEX IF EXISTS "Application_userId_jobId_key";
    CREATE UNIQUE INDEX IF NOT EXISTS "Application_userId_jobId_key"
      ON "Application"("userId", "jobId");
  END IF;
END $$;
