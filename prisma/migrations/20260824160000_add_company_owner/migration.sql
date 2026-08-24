-- Add ownerId column to Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "Company_ownerId_idx" ON "Company"("ownerId");
