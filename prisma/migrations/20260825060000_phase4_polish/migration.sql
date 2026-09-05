-- ============================================================
-- Legacy incremental migration (pre-baseline).
-- Safe on empty DB; baseline owns full Interview/Profile/Subscriber.
-- ============================================================

DO $$
BEGIN
  -- Profile resume columns
  IF to_regclass('public."Profile"') IS NOT NULL THEN
    ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "resumeUrl" TEXT;
    ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "resumeData" TEXT;
    ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "resumeParsed" TEXT;
  END IF;

  -- Interview (only if Job + User already exist and Interview missing)
  IF to_regclass('public."Interview"') IS NULL
     AND to_regclass('public."Job"') IS NOT NULL
     AND to_regclass('public."User"') IS NOT NULL THEN
    CREATE TABLE "Interview" (
      "id" TEXT NOT NULL,
      "jobId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "scheduledAt" TIMESTAMP(3) NOT NULL,
      "duration" INTEGER NOT NULL DEFAULT 30,
      "type" TEXT NOT NULL DEFAULT 'video',
      "status" TEXT NOT NULL DEFAULT 'scheduled',
      "notes" TEXT,
      "meetLink" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "Interview_jobId_idx" ON "Interview"("jobId");
    CREATE INDEX IF NOT EXISTS "Interview_userId_idx" ON "Interview"("userId");
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Interview_jobId_fkey') THEN
      ALTER TABLE "Interview"
        ADD CONSTRAINT "Interview_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "Job"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Interview_userId_fkey') THEN
      ALTER TABLE "Interview"
        ADD CONSTRAINT "Interview_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  -- Subscriber
  IF to_regclass('public."Subscriber"') IS NULL THEN
    CREATE TABLE "Subscriber" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_email_key" ON "Subscriber"("email");
  END IF;
END $$;
