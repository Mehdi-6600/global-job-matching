-- OutreachAttempt — persistent 7-day dedup for employer outreach cron
-- Guarantees at most one outreach per company per 7-day window even under concurrent cron runs.
-- Uses unique windowKey = companyKey:windowStart (UTC, 7-day bucket since epoch)

CREATE TABLE IF NOT EXISTS "OutreachAttempt" (
  "id"                TEXT NOT NULL,
  "companyId"         TEXT,
  "companyKey"        TEXT NOT NULL,
  "companyName"       TEXT NOT NULL,
  "email"             TEXT,
  "status"            TEXT NOT NULL DEFAULT 'pending',
  "windowKey"         TEXT NOT NULL,
  "providerMessageId" TEXT,
  "error"             TEXT,
  "sentAt"            TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutreachAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutreachAttempt_windowKey_key" ON "OutreachAttempt"("windowKey");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_companyKey_idx" ON "OutreachAttempt"("companyKey");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_companyId_idx" ON "OutreachAttempt"("companyId");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_status_idx" ON "OutreachAttempt"("status");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_createdAt_idx" ON "OutreachAttempt"("createdAt");
CREATE INDEX IF NOT EXISTS "OutreachAttempt_windowKey_idx" ON "OutreachAttempt"("windowKey");

-- FK optional (SET NULL on delete) — additive, safe
DO $$ BEGIN
  ALTER TABLE "OutreachAttempt" ADD CONSTRAINT "OutreachAttempt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
