-- Align Transaction.amount with schema.prisma: Decimal(12, 2)
-- Previous migration set DECIMAL(10, 2). Widening is safe (no data loss).

ALTER TABLE "Transaction"
  ALTER COLUMN "amount" TYPE DECIMAL(12,2)
  USING "amount"::DECIMAL(12,2);
