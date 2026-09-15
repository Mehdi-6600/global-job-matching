-- Job search / filter indexes
CREATE INDEX IF NOT EXISTS "Job_location_idx" ON "Job"("location");
CREATE INDEX IF NOT EXISTS "Job_remote_idx" ON "Job"("remote");
CREATE INDEX IF NOT EXISTS "Job_type_idx" ON "Job"("type");
CREATE INDEX IF NOT EXISTS "Job_experience_idx" ON "Job"("experience");
CREATE INDEX IF NOT EXISTS "Job_salaryMin_idx" ON "Job"("salaryMin");
CREATE INDEX IF NOT EXISTS "Job_salaryMax_idx" ON "Job"("salaryMax");
CREATE INDEX IF NOT EXISTS "Job_status_createdAt_idx" ON "Job"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Job_status_remote_createdAt_idx" ON "Job"("status", "remote", "createdAt");

-- Array containment (tags has) — GIN is efficient for PostgreSQL text[]
CREATE INDEX IF NOT EXISTS "Job_tags_gin_idx" ON "Job" USING GIN ("tags");

-- Company location filter
CREATE INDEX IF NOT EXISTS "Company_location_idx" ON "Company"("location");

-- Application list by user + status
CREATE INDEX IF NOT EXISTS "Application_userId_status_idx" ON "Application"("userId", "status");
