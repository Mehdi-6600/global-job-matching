-- CreateTable JobAlert
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

    CONSTRAINT "JobAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobAlert_userId_idx" ON "JobAlert"("userId");

-- AddForeignKey
ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCryptoFields
ALTER TABLE "Transaction" ADD COLUMN "txHash" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'stripe';
