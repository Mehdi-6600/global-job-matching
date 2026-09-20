ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "leaseOwner" TEXT;
ALTER TABLE "JobSource" ADD COLUMN IF NOT EXISTS "leaseUntil" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "JobSource_leaseUntil_idx" ON "JobSource"("leaseUntil");
