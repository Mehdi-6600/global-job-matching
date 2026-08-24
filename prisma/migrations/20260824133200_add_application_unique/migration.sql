-- DropIndex
DROP INDEX IF EXISTS "Application_userId_jobId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_jobId_key" ON "Application"("userId", "jobId");
