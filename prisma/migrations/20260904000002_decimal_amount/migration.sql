-- ============================================================
-- Convert Transaction.amount from DOUBLE PRECISION to Decimal(10,2)
-- for safe monetary calculations.
-- ============================================================

ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE DECIMAL(10,2) USING "amount"::DECIMAL(10,2);
