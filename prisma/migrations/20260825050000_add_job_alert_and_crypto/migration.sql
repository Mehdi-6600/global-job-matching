-- ============================================================
-- Legacy incremental migration (pre-baseline).
-- Safe on empty DB; baseline creates JobAlert + Transaction columns.
-- ============================================================

DO $$
BEGIN
  -- JobAlert
  IF to_regclass('public."JobAlert"') IS NULL
     AND to_regclass('public."User"') IS NOT NULL THEN
    CREATE TABLE "JobAlert" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "keywords" TEXT,
      "location" TEXT,
      "remote" BOOLEAN,
      "type" TEXT,
      "minSalary" INTEGER,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "JobAlert_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "JobAlert_userId_idx" ON "JobAlert"("userId");
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'JobAlert_userId_fkey'
    ) THEN
      ALTER TABLE "JobAlert"
        ADD CONSTRAINT "JobAlert_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  ELSIF to_regclass('public."JobAlert"') IS NOT NULL THEN
    ALTER TABLE "JobAlert"
      ADD COLUMN IF NOT EXISTS "updatedAt"
      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- Transaction crypto fields
  IF to_regclass('public."Transaction"') IS NOT NULL THEN
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "txHash" TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'stripe';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "cryptoType" TEXT;
  END IF;
END $$;
