-- ============================================================
-- Add sessionVersion to User for secure session invalidation.
-- When password/role/email changes, incrementing this version
-- invalidates all existing JWT sessions.
-- ============================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "User_sessionVersion_idx" ON "User"("sessionVersion");
