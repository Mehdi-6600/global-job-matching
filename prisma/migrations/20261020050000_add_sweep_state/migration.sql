-- SweepState — a time-based lease for background jobs.
--
-- Why: the Vercel Hobby plan allows cron jobs to run at most once per day, so
-- the 10-minute payment verification sweep cannot live in vercel.json (doing so
-- fails every deployment — that is what blocked production on 2026-10-18).
-- The sweep now runs inside the app: a request handler claims the slot by
-- updating this row, and only one instance can win per interval.
--
-- Idempotent and additive: safe to run on a database that already has it.

CREATE TABLE IF NOT EXISTS "SweepState" (
  "id"             TEXT NOT NULL,
  "lastStartedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastFinishedAt" TIMESTAMP(3),
  "lastResult"     JSONB,
  "lastError"      TEXT,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SweepState_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SweepState" ADD COLUMN IF NOT EXISTS "lastStartedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SweepState" ADD COLUMN IF NOT EXISTS "lastFinishedAt" TIMESTAMP(3);
ALTER TABLE "SweepState" ADD COLUMN IF NOT EXISTS "lastResult"     JSONB;
ALTER TABLE "SweepState" ADD COLUMN IF NOT EXISTS "lastError"      TEXT;
ALTER TABLE "SweepState" ADD COLUMN IF NOT EXISTS "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "SweepState_lastStartedAt_idx" ON "SweepState"("lastStartedAt");
