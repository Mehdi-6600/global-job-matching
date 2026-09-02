-- ============================================================
-- GLOBAL JOB MATCHING
-- Production Database Baseline
-- PostgreSQL / Prisma 6
--
-- Purpose:
-- 1. Replace the previous db-push based production strategy.
-- 2. Create the complete schema on a fresh database.
-- 3. Safely align an existing database previously created with
--    prisma db push.
--
-- IMPORTANT:
-- This migration is intentionally idempotent.
-- Existing legacy columns are preserved instead of being dropped.
-- ============================================================


-- ============================================================
-- USER
-- ============================================================

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "password" TEXT,
  "role" TEXT NOT NULL DEFAULT 'JOB_SEEKER',
  "plan" TEXT NOT NULL DEFAULT 'free',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- CATEGORY
-- ============================================================

CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "icon" TEXT,
  "color" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Category_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- COMPANY
-- ============================================================

CREATE TABLE IF NOT EXISTS "Company" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "description" TEXT,
  "location" TEXT,
  "website" TEXT,
  "logo" TEXT,
  "ownerId" TEXT,
  "email" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Company_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- JOB
-- ============================================================

CREATE TABLE IF NOT EXISTS "Job" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "salary" TEXT,
  "type" TEXT NOT NULL,
  "remote" BOOLEAN NOT NULL DEFAULT false,
  "experience" TEXT,
  "salaryMin" INTEGER,
  "salaryMax" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "requirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "responsibilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "benefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "deadline" TIMESTAMP(3),
  "categoryId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "companyId" TEXT,
  "postedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Job_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- NEXTAUTH ACCOUNT
-- ============================================================

CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,

  CONSTRAINT "Account_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- NEXTAUTH SESSION
-- ============================================================

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Session_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- NEXTAUTH VERIFICATION TOKEN
-- ============================================================

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);


-- ============================================================
-- TRANSACTION
-- ============================================================

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "cryptoType" TEXT,
  "txHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "type" TEXT NOT NULL DEFAULT 'card',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Transaction_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- PASSWORD RESET
-- ============================================================

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PasswordResetToken_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- APPLICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS "Application" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "coverLetter" TEXT,
  "resume" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Application_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- INTERVIEW
-- ============================================================

CREATE TABLE IF NOT EXISTS "Interview" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "duration" INTEGER NOT NULL DEFAULT 30,
  "type" TEXT NOT NULL DEFAULT 'video',
  "meetLink" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Interview_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- MESSAGE
-- ============================================================

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Message_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- NOTIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "description" TEXT,
  "actionUrl" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "type" TEXT NOT NULL DEFAULT 'general',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- SAVED JOB
-- ============================================================

CREATE TABLE IF NOT EXISTS "SavedJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SavedJob_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- JOB ALERT
-- ============================================================

CREATE TABLE IF NOT EXISTS "JobAlert" (
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

  CONSTRAINT "JobAlert_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- PROFILE
-- ============================================================

CREATE TABLE IF NOT EXISTS "Profile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bio" TEXT,
  "skills" TEXT,
  "experience" TEXT,
  "education" TEXT,
  "resumeUrl" TEXT,
  "phone" TEXT,
  "location" TEXT,
  "linkedin" TEXT,
  "github" TEXT,
  "portfolio" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Profile_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- BLOG POST
-- ============================================================

CREATE TABLE IF NOT EXISTS "BlogPost" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT,
  "coverImage" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "authorId" TEXT NOT NULL,
  "category" TEXT,
  "tags" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BlogPost_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- SUBSCRIBER
-- ============================================================

CREATE TABLE IF NOT EXISTS "Subscriber" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Subscriber_pkey"
    PRIMARY KEY ("id")
);


-- ============================================================
-- COLUMN REPAIR
-- ============================================================

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "name" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "image" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "password" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'JOB_SEEKER';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "createdAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "updatedAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;


ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "status"
  TEXT NOT NULL DEFAULT 'active';

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "createdAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "updatedAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;


ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "salaryMin" INTEGER;

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "salaryMax" INTEGER;

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "currency"
  TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "requirements"
  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "responsibilities"
  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "benefits"
  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "tags"
  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "deadline"
  TIMESTAMP(3);

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "categoryId"
  TEXT;

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "status"
  TEXT NOT NULL DEFAULT 'active';

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "viewCount"
  INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "companyId"
  TEXT;

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "postedById"
  TEXT;

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "createdAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "updatedAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;


ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "cryptoType"
  TEXT;

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "txHash"
  TEXT;

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "status"
  TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "type"
  TEXT NOT NULL DEFAULT 'card';

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "createdAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "updatedAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;


ALTER TABLE "Interview"
  ADD COLUMN IF NOT EXISTS "companyId"
  TEXT;

ALTER TABLE "Interview"
  ADD COLUMN IF NOT EXISTS "meetLink"
  TEXT;

ALTER TABLE "Interview"
  ADD COLUMN IF NOT EXISTS "createdAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Interview"
  ADD COLUMN IF NOT EXISTS "updatedAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;


ALTER TABLE "JobAlert"
  ADD COLUMN IF NOT EXISTS "updatedAt"
  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;


ALTER TABLE "Subscriber"
  ADD COLUMN IF NOT EXISTS "userId"
  TEXT;


ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "resumeUrl"
  TEXT;


-- ============================================================
-- LEGACY COLUMNS
-- ============================================================
--
-- Older migrations may have created:
--
-- Transaction.paymentMethod
-- Profile.resumeData
-- Profile.resumeParsed
--
-- They are intentionally NOT dropped.
--
-- Prisma ignores additional database columns.
-- Keeping them avoids unnecessary data-loss during migration.
-- ============================================================


-- ============================================================
-- UNIQUE INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
  "User_email_key"
  ON "User"("email");

CREATE UNIQUE INDEX IF NOT EXISTS
  "Account_provider_providerAccountId_key"
  ON "Account"("provider", "providerAccountId");

CREATE UNIQUE INDEX IF NOT EXISTS
  "Session_sessionToken_key"
  ON "Session"("sessionToken");

CREATE UNIQUE INDEX IF NOT EXISTS
  "VerificationToken_token_key"
  ON "VerificationToken"("token");

CREATE UNIQUE INDEX IF NOT EXISTS
  "VerificationToken_identifier_token_key"
  ON "VerificationToken"("identifier", "token");

CREATE UNIQUE INDEX IF NOT EXISTS
  "Company_slug_key"
  ON "Company"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS
  "Category_name_key"
  ON "Category"("name");

CREATE UNIQUE INDEX IF NOT EXISTS
  "Category_slug_key"
  ON "Category"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS
  "Transaction_txHash_key"
  ON "Transaction"("txHash");

CREATE UNIQUE INDEX IF NOT EXISTS
  "Application_userId_jobId_key"
  ON "Application"("userId", "jobId");

CREATE UNIQUE INDEX IF NOT EXISTS
  "SavedJob_userId_jobId_key"
  ON "SavedJob"("userId", "jobId");

CREATE UNIQUE INDEX IF NOT EXISTS
  "Profile_userId_key"
  ON "Profile"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS
  "BlogPost_slug_key"
  ON "BlogPost"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS
  "Subscriber_email_key"
  ON "Subscriber"("email");

CREATE UNIQUE INDEX IF NOT EXISTS
  "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");


-- ============================================================
-- NORMAL INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
  "User_email_idx"
  ON "User"("email");

CREATE INDEX IF NOT EXISTS
  "User_role_idx"
  ON "User"("role");


CREATE INDEX IF NOT EXISTS
  "Account_userId_idx"
  ON "Account"("userId");

CREATE INDEX IF NOT EXISTS
  "Session_userId_idx"
  ON "Session"("userId");


CREATE INDEX IF NOT EXISTS
  "Company_ownerId_idx"
  ON "Company"("ownerId");

CREATE INDEX IF NOT EXISTS
  "Company_status_idx"
  ON "Company"("status");


CREATE INDEX IF NOT EXISTS
  "Job_companyId_idx"
  ON "Job"("companyId");

CREATE INDEX IF NOT EXISTS
  "Job_postedById_idx"
  ON "Job"("postedById");

CREATE INDEX IF NOT EXISTS
  "Job_createdAt_idx"
  ON "Job"("createdAt");

CREATE INDEX IF NOT EXISTS
  "Job_status_idx"
  ON "Job"("status");

CREATE INDEX IF NOT EXISTS
  "Job_categoryId_idx"
  ON "Job"("categoryId");


CREATE INDEX IF NOT EXISTS
  "Transaction_userId_idx"
  ON "Transaction"("userId");

CREATE INDEX IF NOT EXISTS
  "Transaction_txHash_idx"
  ON "Transaction"("txHash");

CREATE INDEX IF NOT EXISTS
  "Transaction_status_idx"
  ON "Transaction"("status");


CREATE INDEX IF NOT EXISTS
  "PasswordResetToken_email_idx"
  ON "PasswordResetToken"("email");

CREATE INDEX IF NOT EXISTS
  "PasswordResetToken_tokenHash_idx"
  ON "PasswordResetToken"("tokenHash");


CREATE INDEX IF NOT EXISTS
  "Application_userId_idx"
  ON "Application"("userId");

CREATE INDEX IF NOT EXISTS
  "Application_jobId_idx"
  ON "Application"("jobId");

CREATE INDEX IF NOT EXISTS
  "Application_status_idx"
  ON "Application"("status");


CREATE INDEX IF NOT EXISTS
  "Interview_userId_idx"
  ON "Interview"("userId");

CREATE INDEX IF NOT EXISTS
  "Interview_jobId_idx"
  ON "Interview"("jobId");

CREATE INDEX IF NOT EXISTS
  "Interview_companyId_idx"
  ON "Interview"("companyId");

CREATE INDEX IF NOT EXISTS
  "Interview_status_idx"
  ON "Interview"("status");

CREATE INDEX IF NOT EXISTS
  "Interview_scheduledAt_idx"
  ON "Interview"("scheduledAt");


CREATE INDEX IF NOT EXISTS
  "Message_senderId_idx"
  ON "Message"("senderId");

CREATE INDEX IF NOT EXISTS
  "Message_receiverId_idx"
  ON "Message"("receiverId");

CREATE INDEX IF NOT EXISTS
  "Message_read_idx"
  ON "Message"("read");


CREATE INDEX IF NOT EXISTS
  "Notification_userId_idx"
  ON "Notification"("userId");

CREATE INDEX IF NOT EXISTS
  "Notification_read_idx"
  ON "Notification"("read");


CREATE INDEX IF NOT EXISTS
  "SavedJob_userId_idx"
  ON "SavedJob"("userId");


CREATE INDEX IF NOT EXISTS
  "JobAlert_userId_idx"
  ON "JobAlert"("userId");


CREATE INDEX IF NOT EXISTS
  "Profile_userId_idx"
  ON "Profile"("userId");


CREATE INDEX IF NOT EXISTS
  "BlogPost_authorId_idx"
  ON "BlogPost"("authorId");

CREATE INDEX IF NOT EXISTS
  "BlogPost_published_idx"
  ON "BlogPost"("published");

CREATE INDEX IF NOT EXISTS
  "BlogPost_slug_idx"
  ON "BlogPost"("slug");


CREATE INDEX IF NOT EXISTS
  "Subscriber_email_idx"
  ON "Subscriber"("email");


CREATE INDEX IF NOT EXISTS
  "Category_slug_idx"
  ON "Category"("slug");


-- ============================================================
-- FOREIGN KEYS
-- ============================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Account_userId_fkey'
  ) THEN
    ALTER TABLE "Account"
      ADD CONSTRAINT "Account_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Session_userId_fkey'
  ) THEN
    ALTER TABLE "Session"
      ADD CONSTRAINT "Session_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Company_ownerId_fkey'
  ) THEN
    ALTER TABLE "Company"
      ADD CONSTRAINT "Company_ownerId_fkey"
      FOREIGN KEY ("ownerId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Job_companyId_fkey'
  ) THEN
    ALTER TABLE "Job"
      ADD CONSTRAINT "Job_companyId_fkey"
      FOREIGN KEY ("companyId")
      REFERENCES "Company"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Job_postedById_fkey'
  ) THEN
    ALTER TABLE "Job"
      ADD CONSTRAINT "Job_postedById_fkey"
      FOREIGN KEY ("postedById")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Job_categoryId_fkey'
  ) THEN
    ALTER TABLE "Job"
      ADD CONSTRAINT "Job_categoryId_fkey"
      FOREIGN KEY ("categoryId")
      REFERENCES "Category"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Transaction_userId_fkey'
  ) THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Application_userId_fkey'
  ) THEN
    ALTER TABLE "Application"
      ADD CONSTRAINT "Application_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Application_jobId_fkey'
  ) THEN
    ALTER TABLE "Application"
      ADD CONSTRAINT "Application_jobId_fkey"
      FOREIGN KEY ("jobId")
      REFERENCES "Job"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Interview_userId_fkey'
  ) THEN
    ALTER TABLE "Interview"
      ADD CONSTRAINT "Interview_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Interview_jobId_fkey'
  ) THEN
    ALTER TABLE "Interview"
      ADD CONSTRAINT "Interview_jobId_fkey"
      FOREIGN KEY ("jobId")
      REFERENCES "Job"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Interview_companyId_fkey'
  ) THEN
    ALTER TABLE "Interview"
      ADD CONSTRAINT "Interview_companyId_fkey"
      FOREIGN KEY ("companyId")
      REFERENCES "Company"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Message_senderId_fkey'
  ) THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_senderId_fkey"
      FOREIGN KEY ("senderId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Message_receiverId_fkey'
  ) THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_receiverId_fkey"
      FOREIGN KEY ("receiverId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Notification_userId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SavedJob_userId_fkey'
  ) THEN
    ALTER TABLE "SavedJob"
      ADD CONSTRAINT "SavedJob_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SavedJob_jobId_fkey'
  ) THEN
    ALTER TABLE "SavedJob"
      ADD CONSTRAINT "SavedJob_jobId_fkey"
      FOREIGN KEY ("jobId")
      REFERENCES "Job"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JobAlert_userId_fkey'
  ) THEN
    ALTER TABLE "JobAlert"
      ADD CONSTRAINT "JobAlert_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Profile_userId_fkey'
  ) THEN
    ALTER TABLE "Profile"
      ADD CONSTRAINT "Profile_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BlogPost_authorId_fkey'
  ) THEN
    ALTER TABLE "BlogPost"
      ADD CONSTRAINT "BlogPost_authorId_fkey"
      FOREIGN KEY ("authorId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Subscriber_userId_fkey'
  ) THEN
    ALTER TABLE "Subscriber"
      ADD CONSTRAINT "Subscriber_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

END $$;
