-- Add isActive and verified flags to Company.
-- Both columns are additive with safe defaults:
--   - isActive = true   → all existing companies stay enabled
--   - verified = false  → all existing companies remain unverified (admin approval)
-- No data is modified or deleted.

ALTER TABLE "Company" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");
CREATE INDEX "Company_verified_idx" ON "Company"("verified");
