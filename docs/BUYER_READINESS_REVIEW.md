# Buyer-readiness review — global-job-matching (2026-10-14)

Branch: `arena/041d4c02-global-job-matching` (base `main` @ `ab40290`). Draft PR #6.
This document records what was verified, what was not, and what needs an owner decision.
It does not claim the app is bug-free or fully secure.

## A. Repository summary
- Next.js 15.5.27 (upgraded from 15.1.11), React 19, Prisma 6.19 (client), NextAuth 5.0.0-beta.32 (from beta.25), Node ≥ 20.9.
- Auth gate is in `src/middleware.ts` + `src/lib/auth.config.ts`; route classes in `src/lib/route-access.ts`.
- 21 migrations (19 original + 2 added in this branch). Schema: `prisma/schema.prisma`.
- Test suite: 93 files, 850 tests (7 skipped). Lockfile `package-lock.json` (npm) updated in place, not regenerated.

## B. Defects
| ID | Defect | Status |
|----|--------|--------|
| D1 | Locale-prefixed public pages (`/fa/jobs`, `/de/pricing`) redirected guests to login. **Confirmed live** (read-only GET before the fix). | Fixed (`a7b573a`); verified on a local production build |
| D2 | Unknown URLs redirected guests to login instead of 404. **Confirmed live.** | Fixed; local build returns 404 |
| D3 | Shared career-risk links required login although the share API is unauthenticated. | Fixed |
| D4 | `canManageJob` granted the original poster access under an unknown/empty role. | Fixed (`21e468a`) |
| D5 | Unsupported crypto asset reported as "hash format invalid". Still fail-closed. | Fixed (`8ade448`) |
| D6 | Spanish "migrar" not classified as migration intent. | Fixed |
| D7 | Arabic experience units (سنوات/سنة/سنه) gave no experience score. | Fixed |
| D8 | Fresh database failed in migration `20260220…` (`42P01 "Company"`). | Fixed; CI `prisma migrate deploy` passes on fresh Postgres 16 |
| D9 | Schema drift: `PaymentIntent`, Transaction payment columns, Job ingestion columns, several indexes declared in the schema but created by no migration. | Fixed for fresh DBs (`20260902090100`); production state unknown |
| D10 | Stale/mis-wired tests (hoisting, fixtures, outdated expectations). | Repaired with per-commit justification |
| D11 | Stale doc claimed the build runs `prisma migrate deploy`. It does not. | Corrected in `docs/MIGRATION_STRATEGY.md` |

**Open (low/medium):**
- `updateJobForUser` lets the poster detach `companyId` (`null`) without a company-ownership check. Low; needs a policy decision (see H).
- Duplicate `txHash` race in `crypto-payment` returns generic 500 (the DB unique constraint prevents double credit). Low; response code only, not changed without approval.
- Rate limiting: Redis is disabled in code (`createClient()` returns `null`), so limits are per serverless instance.
- CSP `script-src` includes `'unsafe-inline' 'unsafe-eval'` (documented in `next.config.js`).
- Stray root `migration.sql` (diverged copy, not used by Prisma). Remove in a separate change.
- `prisma migrate deploy` is not part of `npm run build`; the production schema depends on a separate, explicit step.

## C. Tests
- Before: 19 failing of 704; 12 TypeScript errors (all in tests); 20 failing suites.
- Now: `npx tsc --noEmit` passes (0 errors). `npm run lint`: 0 errors. `npm run i18n:check`: passes.
- Local Vitest: 842 passed, 7 skipped, **1 failed** (policy decision, below). The concurrency integration test needs a real Prisma engine and DB; it runs in CI.
- CI run `38532110380` on commit `88ce04a` (dependency upgrade): Typecheck ✓, Lint ✓, `prisma migrate deploy` ✓, Unit tests ✗ (only `ownership.test.ts` › "Employer cannot manage a job without a company"). The production build step is skipped by CI after the test failure.
- Local `next build` (Next 15.5.27) succeeds with a local-only font mock (`NEXT_FONT_GOOGLE_MOCKED_RESPONSES`) because the sandbox cannot reach Google Fonts. The mock is not committed.

## D. Security
- Auth gate: classification by locale-stripped path; unknown routes pass to 404; private routes require login; admin/employer role checks retained. Covered by tests and by a route-coverage scan that fails if any page is unclassified.
- Ownership: fail-closed for unknown roles. `OWNER` remains admin-level by policy (`src/lib/roles.ts`).
- Bearer-secret endpoints (cron, sync, seed) fail closed. Verified over HTTP without credentials: admin/profile/payment → 401, seed → 403, cron → 503 (no secret configured).
- Security headers present on `/` (HSTS, X-Frame-Options DENY, nosniff, CSP).
- Dependencies (`npm audit`): before 26 (5 critical, 16 high, 5 moderate). After: 23 (2 critical, 15 high, 6 moderate). Remaining criticals are Vitest 3.x and tinypool (dev/test only); the fix needs a Vitest major upgrade. Remaining highs are mostly build/dev tooling (Prisma CLI, eslint, tailwind) and `sharp` via `next` (image optimisation). These need a planned upgrade, not this PR.

## E. Migration
- Local catalog check (disposable PostgreSQL 16): all 21 migrations apply to an empty database; re-running is a no-op; catalog matches `schema.prisma` except the deliberately omitted `Interview(userId, jobId)` unique index.
- CI: `prisma migrate deploy` on fresh `postgres:16` succeeded.
- **Production: not verified.** Need read-only `prisma migrate status`, a backup, duplicate checks, and a staging run before any deploy. See `docs/MIGRATION_STRATEGY.md`.

## F. Payment / crypto review (code review only; no live transactions)
Checked in `src/app/api/crypto-payment/route.ts` and `src/lib/payment/*`:
- Intent must belong to the caller, be `pending`, and not be expired. State transitions are enforced.
- Recipient wallet must match the quote. Duplicate `txHash` is rejected and enforced by a unique constraint.
- On-chain check requires recipient match and amount within tolerance. Verification is fail-closed when explorers/RPC are unavailable. TON verification is disabled (fail-closed).
- The claim is atomic (`updateMany` from `pending` to `submitted`) inside a transaction.
- `/api/payment` refuses paid plans and points to crypto checkout. Card payments are not integrated.
- Residual / policy: 2% underpayment tolerance (`AMOUNT_TOLERANCE_UNDER`); duplicate-tx race returns 500; the on-chain result depends on third-party explorer/RPC availability.

## G. Diff inventory (branch vs `main`)
Commits: `03a566d` migrations · `a7b573a` route classification + auth tests · `21e468a` ownership · `8ade448` verify-crypto · `a9a218a` intent / Arabic year units / helper exports · `fa5f00d` mocks and ingestion fixtures · `3189e48` stale expectations and typings · `88ce04a` dependency upgrade · `9f17047` docs. Plus `vitest.config.ts` (inline `next-auth`).

## H. Blockers and owner decisions
Decisions (not made here):
1. **Poster access without a company** (`ownership.test.ts`): code and `updateJobForUser` allow the poster; the test expects denial. This is the one failing test in CI. Choose a policy and align code or test.
2. **AI rate limit when Redis is down**: the code falls back to a per-instance memory cap (3/min). The earlier test expected a full block. Decide whether AI should be blocked entirely while Redis is down, and whether to re-enable Upstash.
3. **Interview unique index**: add only after checking production for duplicate rows.
4. **Crypto underpayment tolerance** (2%) and whether duplicate-tx responses should be 409.

Blocked in this environment:
- Production HTTP: the sandbox cannot reach `vercel.app` (curl status 000). Only read-only GETs via the page-fetch tool were used: `/fa/jobs`, `/this-page-does-not-exist`, `/jobs`.
- Real Prisma engines: `binaries.prisma.sh` is unreachable. Local DB-backed tests and `next start` with DB pages are not representative; CI is the authoritative DB run.
- CI job logs: downloads return EOF. Failure details came from check-run annotations.
- Google Fonts: blocked, so the local build needs a mock.
- Branch name is fixed by the session (`arena/041d4c02-global-job-matching`); the suggested `fix/buyer-readiness-stabilization` was not created.

## I. Release recommendation
**Not ready for buyer release.** The branch is ready for review and merge after the four owner decisions above and one green CI run. Merging, Production migrations, Production deploys, environment changes, and payment-behavior changes need separate explicit approval. Do not treat this review as proof the app is bug-free or fully secure.
