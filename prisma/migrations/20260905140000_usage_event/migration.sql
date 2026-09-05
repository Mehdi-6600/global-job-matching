-- UsageEvent ledger for AI and other quota accounting (not Notification)

CREATE TABLE IF NOT EXISTS "UsageEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "periodKey" TEXT,
  "meta" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UsageEvent_userId_idx" ON "UsageEvent"("userId");
CREATE INDEX IF NOT EXISTS "UsageEvent_userId_kind_createdAt_idx"
  ON "UsageEvent"("userId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "UsageEvent_userId_kind_periodKey_idx"
  ON "UsageEvent"("userId", "kind", "periodKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UsageEvent_userId_fkey'
  ) THEN
    ALTER TABLE "UsageEvent"
      ADD CONSTRAINT "UsageEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
