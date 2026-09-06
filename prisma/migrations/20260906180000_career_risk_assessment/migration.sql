-- CreateTable CareerRiskAssessment (idempotent-ish)
CREATE TABLE IF NOT EXISTS "CareerRiskAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "skills" TEXT,
    "industry" TEXT,
    "experienceYears" INTEGER,
    "country" TEXT,
    "location" TEXT,
    "education" TEXT,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "skillsToBuild" JSONB NOT NULL,
    "alternatives" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "paidSnapshot" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CareerRiskAssessment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CareerRiskAssessment_shareToken_key" ON "CareerRiskAssessment"("shareToken");
CREATE INDEX IF NOT EXISTS "CareerRiskAssessment_userId_createdAt_idx" ON "CareerRiskAssessment"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CareerRiskAssessment_shareToken_idx" ON "CareerRiskAssessment"("shareToken");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CareerRiskAssessment_userId_fkey'
  ) THEN
    ALTER TABLE "CareerRiskAssessment"
      ADD CONSTRAINT "CareerRiskAssessment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
