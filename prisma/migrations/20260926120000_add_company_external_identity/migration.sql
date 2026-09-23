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
