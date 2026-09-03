# Global Job Matching — Production Audit Report

**Date:** September 3, 2026  
**Repository:** Mehdi-6600/global-job-matching  
**Scope:** Full-stack Next.js + Prisma + PostgreSQL job marketplace  
**Status:** Documentation of critical and high-severity issues

---

## Executive Summary

This repository is a job matching platform with authentication, employer job management, job seeker features, payments, subscriptions, and admin functionality. The codebase has solid foundations (Next.js 15, Prisma 6, NextAuth, TypeScript) but contains **5 P0-severity** and **6 P1-severity** issues that must be fixed before production deployment.

Critical issues involve:
- Concurrent job creation bypassing plan limits (race condition)
- Concurrent company creation creating duplicates (race condition)
- No subscription expiration lifecycle for paid plans
- Crypto payment confirmation insufficient (hash-only verification)
- Missing plan limits enforcement at database level

---

## P0 — CRITICAL ISSUES

### P0–1: Race Condition in Job Creation Plan Limits

**Title:** Concurrent requests can exceed employer active job limit  
**Severity:** P0 (Authorization bypass / business rule violation)  
**Files:**
- `src/services/jobs/create-job.ts` (lines 113–133)
- `src/app/api/jobs/route.ts` (POST handler)
- `src/app/api/employer/jobs/route.ts` (POST handler)

**Root Cause:**  
Job count is fetched in a separate query (`db.job.count()`), then a decision is made to allow creation. Between the count and create, another concurrent request may also pass the limit check. Multiple requests can race and all create jobs, exceeding the plan limit.

**Recommended Fix:**  
Implement a pessimistic lock or atomic operation at the database level using a PostgreSQL transaction with `SELECT FOR UPDATE` on a plan-limit tracking table, or enforce a unique constraint combined with an application-level check that fails gracefully on constraint violation.

---

### P0–2: Race Condition in Company Creation (Duplicate Default Company)

**Title:** Concurrent requests can create multiple default companies for the same employer  
**Severity:** P0 (Data integrity / business rule violation)  
**Files:**
- `src/services/jobs/create-job.ts` (lines 156–174)
- `src/app/api/companies/route.ts` (POST handler)

**Root Cause:**  
When an employer has no company, `findFirst()` checks for an existing company and immediately creates one if absent. Two concurrent requests both see no company and both create, violating the one-default-company-per-employer invariant.

**Recommended Fix:**  
Add a database constraint or use an UPSERT pattern with a unique index on `(ownerId, name)` where name is "My Company" or similar. Ensure creation is transactionally safe.

---

### P0–3: No Subscription Expiration Lifecycle for Paid Plans

**Title:** Paid plans have no expiration field and become permanently active  
**Severity:** P0 (Business logic / revenue integrity)  
**Files:**
- `prisma/schema.prisma` (User model, line 52–82)
- `src/lib/payment/plans.ts` (plan definitions)
- `src/app/api/payment/route.ts` (payment handling)
- `src/app/api/crypto-payment/route.ts` (crypto payment handling)

**Root Cause:**  
The `User.plan` field contains the active plan name (e.g., "pro", "business") but has no timestamp fields (`planStartedAt`, `planExpiresAt`, `billingCycle`). Once a user is upgraded to a paid plan, there is no mechanism to track when the subscription should expire or renew. No monthly/yearly billing period is persisted.

**Recommended Fix:**  
Add fields to the `User` model:
- `planStartedAt?: DateTime` — when the current plan was activated
- `planExpiresAt?: DateTime` — when the current plan expires
- `billingCycle?: "monthly" | "yearly"` — the billing period of the current subscription

Implement a function to determine if a plan is expired and revert to "free". Ensure crypto and card payment endpoints set these fields on transaction confirmation.

---

### P0–4: Crypto Payment Confirmation Without Blockchain Verification

**Title:** A transaction hash alone can activate a paid plan without validation  
**Severity:** P0 (Payment security / fraud)  
**Files:**
- `src/app/api/crypto-payment/route.ts` (lines 56–81)
- `src/lib/payment/plans.ts` (payment configuration)

**Root Cause:**  
The POST endpoint accepts a `txHash` from the user, checks for duplicate hashes in the database, and creates a transaction with status "pending". The endpoint does not verify that:
1. The transaction hash is real
2. The transaction is on the correct blockchain
3. The transaction is sent to the correct wallet
4. The transaction has sufficient confirmations
5. The transaction is for the correct amount/asset

The plan is only activated after admin confirmation (see admin endpoint), but there is no documented mechanism to confirm transactions, and crypto payment status changes are not queried by the user-facing code.

**Recommended Fix:**  
Document that crypto payments remain in "pending" status until an admin explicitly confirms via an admin-only endpoint. Add that confirmation endpoint if missing. Prevent plan upgrades from using status "pending" transactions. Alternatively, integrate actual blockchain verification via external service (e.g., blockchain explorer API) before marking status "confirmed".

---

### P0–5: Crypto Payment Billing Period Not Persisted

**Title:** Monthly vs. yearly billing choice is lost after transaction creation  
**Severity:** P0 (Business logic / revenue integrity)  
**Files:**
- `src/app/api/crypto-payment/route.ts` (lines 56–96)
- `src/lib/payment/plans.ts` (getPlanAmount function)
- `prisma/schema.prisma` (Transaction model, lines 145–163)

**Root Cause:**  
The crypto payment endpoint accepts a `billing` parameter ("monthly" or "yearly"), calculates the correct amount (line 58), and stores the transaction. However, the `Transaction` model has no `billingCycle` field, so the billing period is not persisted. When an admin later confirms the transaction, there is no record of whether it was monthly or yearly, preventing correct subscription setup.

**Recommended Fix:**  
Add a `billingCycle` field to the `Transaction` model (enum: "monthly" | "yearly"), and persist the value from the request. Update the database schema via migration. Use this field when confirming transactions to set the subscription duration.

---

## P1 — HIGH-SEVERITY ISSUES

### P1–1: Duplicate Job Creation Logic (Race Condition Amplified)

**Title:** Multiple entry points to job creation bypass single business logic consolidation  
**Severity:** P1 (Race condition + maintainability)  
**Files:**
- `src/app/api/jobs/route.ts` (POST handler, lines 120–167) — delegating to `createJobForUser`
- `src/app/api/employer/jobs/route.ts` (POST handler, lines 79–141) — also delegating to `createJobForUser`
- `src/services/jobs/create-job.ts` — centralized service

**Root Cause:**  
While a single `createJobForUser` service exists, it is called from at least two API routes. However, the race-condition vulnerability in plan limits and company creation is amplified because both routes can be hit concurrently. The service is correctly consolidated, but the underlying database queries are not atomic.

**Recommended Fix:**  
Ensure `createJobForUser` performs all database operations within a single transaction. Wrap the `count()` → limit check → `create()` flow in `db.$transaction()` with appropriate isolation level. Test concurrent requests.

---

### P1–2: Company Ownership Check Uses Both `ownerId` and `email`

**Title:** Inconsistent company ownership model (legacy `email` vs. `ownerId`)  
**Severity:** P1 (Authorization / data consistency)  
**Files:**
- `prisma/schema.prisma` (Company model, lines 84–104)
- `src/services/jobs/create-job.ts` (lines 137–154)
- `src/app/api/companies/route.ts` (lines 108–130)

**Root Cause:**  
The `Company` model has both `ownerId` (a proper foreign key) and `email` (a text field). Job creation checks `company.ownerId !== actor.id` (line 148), but company creation sets both `ownerId` and `email`. Some code paths may rely on `email` matching, creating ambiguity about the authoritative ownership model.

**Recommended Fix:**  
Audit all company ownership checks to ensure they exclusively use `ownerId`. Remove or deprecate the `email` field if it is not required by critical business logic. If email is needed for billing, store it separately or ensure consistency by updating it when ownership changes.

---

### P1–3: No Admin Confirmation Endpoint for Crypto Payments

**Title:** Crypto transactions are marked "pending" but no documented admin confirmation mechanism  
**Severity:** P1 (Payment workflow / business continuity)  
**Files:**
- `src/app/api/crypto-payment/route.ts` (transaction creation, status always "pending")
- `src/app/api/admin/` (missing crypto payment confirmation endpoint)

**Root Cause:**  
The crypto payment flow creates a transaction with status "pending" and states "Plan activates after admin confirmation." However, there is no documented or visible admin API endpoint to confirm/reject these transactions and update the user's plan.

**Recommended Fix:**  
Create an admin-only endpoint (e.g., `POST /api/admin/crypto-payments/{transactionId}/confirm`) that:
1. Verifies the caller is an admin
2. Updates the transaction status to "confirmed" or "rejected"
3. On "confirmed", updates the user's plan and subscription fields

Ensure this endpoint is secure and well-documented.

---

### P1–4: Rate Limiting Uses Spoofable x-forwarded-for Header

**Title:** Rate limit key derives from client-supplied x-forwarded-for header without validation  
**Severity:** P1 (Rate limit bypass / DoS)  
**Files:**
- `src/app/api/jobs/fetch/route.ts` (lines 14–18)
- `src/app/api/payment/route.ts` (lines 21–24)
- `src/app/api/crypto-payment/route.ts` (lines 32–35)
- `src/app/api/employer/jobs/route.ts` (lines 10–14)

**Root Cause:**  
The code extracts `x-forwarded-for` header and splits on comma to get the client IP:
```typescript
const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
```
If this header is not set by a trusted proxy, a client can spoof different IPs to bypass rate limits. The code falls back to "unknown" if missing, but does not validate that the header is from a trusted proxy.

**Recommended Fix:**  
Only trust `x-forwarded-for` if the request comes through a known/trusted proxy (e.g., Vercel's origin is trusted). For Vercel, use `X-Forwarded-For` from Vercel's documented trusted source, or use a verified request context field. Document the assumption and ensure the production deployment uses a trusted proxy.

---

### P1–5: Missing Job Validation Schemas Export Regression

**Title:** Critical job validation schemas (jobStatusSchema, jobUpdateSchema) may not be exported or may regress  
**Severity:** P1 (API contract / correctness)  
**Files:**
- `src/lib/validation/job.ts` (exports: jobStatusSchema, jobUpdateSchema, jobCreateSchema)

**Root Cause:**  
Validation schemas are defined in `src/lib/validation/job.ts` and exported. However, there is no automated check ensuring these exports remain available. A refactor could accidentally remove or rename them, breaking API routes that import them.

**Recommended Fix:**  
Add a `.test.ts` or `.test` file that imports and validates the schemas' existence. Ensure CI runs this test. Document that these schemas are public API contracts and must not be removed without a deprecation period.

---

### P1–6: Admin Crypto Payment Endpoint Missing Authorization Audit

**Title:** No visible admin payment confirmation endpoint for manual approval flow  
**Severity:** P1 (Admin workflow / security)  
**Files:**
- `src/app/api/admin/` (presumed to exist, but no crypto payment confirmation handler found)

**Root Cause:**  
The crypto payment documentation mentions admin confirmation, but no endpoint is provided to admins to confirm or reject pending crypto transactions. Manual admin workflows for payment confirmation are not visible in the codebase.

**Recommended Fix:**  
Create an admin endpoint to list pending crypto transactions and confirm/reject them. Implement proper admin authorization checks (verify `isAdminRole`). Return updated plan status to the admin and trigger user plan updates on confirmation.

---

## Summary Table

| Issue ID | Title | Severity | File(s) | Type |
|----------|-------|----------|---------|------|
| P0–1 | Race condition in job plan limits | P0 | create-job.ts, jobs routes | Concurrency/Authorization |
| P0–2 | Duplicate company creation | P0 | create-job.ts, companies route | Concurrency/Integrity |
| P0–3 | No subscription expiration | P0 | schema.prisma, payment routes | Business Logic |
| P0–4 | Crypto hash-only verification | P0 | crypto-payment route | Payment Security |
| P0–5 | Billing period not persisted | P0 | crypto-payment route, schema | Payment/Business Logic |
| P1–1 | Duplicate creation logic amplifies race conditions | P1 | jobs routes, create-job service | Concurrency/Maintainability |
| P1–2 | Inconsistent company ownership model | P1 | schema, create-job, companies | Authorization/Data Consistency |
| P1–3 | Missing admin crypto confirmation endpoint | P1 | admin API | Payment Workflow |
| P1–4 | Rate limit uses spoofable header | P1 | fetch, payment routes | Security/Rate Limiting |
| P1–5 | Missing validation schema export tests | P1 | validation/job.ts | API Contract |
| P1–6 | No admin confirmation for crypto payments | P1 | admin API | Workflow/Security |

---

## Recommended Remediation Order

1. **P0–3, P0–5:** Add subscription expiration fields to User model and Transaction.billingCycle field. These are data model changes that all other fixes depend on.
2. **P0–4:** Implement or document crypto payment verification flow (blockchain or admin manual).
3. **P0–1, P0–2:** Fix race conditions using database transactions and constraints.
4. **P1–2:** Audit and consolidate company ownership logic.
5. **P1–3, P1–6:** Implement admin endpoints for crypto payment confirmation.
6. **P1–4:** Validate and document rate limit proxy trust.
7. **P1–1, P1–5:** Test and document API contracts.

---

## Notes

- No immediate P2 or P3 issues have been classified in this phase; focus is on critical and high-severity items.
- Production deployment should not proceed until all P0 issues are resolved and tested.
- Integration tests for concurrency scenarios (P0–1, P0–2) are essential before final release.
