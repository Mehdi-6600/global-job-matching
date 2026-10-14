# Migration Strategy — global-job-matching

## Source of truth
- `prisma/schema.prisma` — application schema
- `prisma/migrations/` — ordered SQL history for `prisma migrate deploy`

## History layout
1. **Pre-baseline (20260824–20260825)** — legacy incremental steps.  
   These are now **idempotent** and skip work when tables do not exist yet.
2. **`20260902090000_production_baseline`** — full idempotent schema for fresh and legacy DBs.
3. **Post-baseline (20260904+)** — forward-only columns (plan dates, sessionVersion, Decimal amount).
4. **`20260905120000_ensure_integrity`** — safety net for missing columns/indexes.

## Production (Vercel + Neon)
Build script:
```bash
prisma migrate deploy && prisma generate && next build

---

## 2026-10 repair: fresh databases (branch `arena/041d4c02-global-job-matching`)

### Problem
On an empty database `prisma migrate deploy` failed at
`20260220120000_add_company_isActive_verified` with `42P01 relation "Company" does not exist`.
The next failure would have been `20260318120000_job_ingestion_network` (`"Job" does not exist`).
Some objects in `prisma/schema.prisma` were never created by any migration in this history
(`PaymentIntent`, `Transaction.paymentIntentId`/`rateUsd`/`expectedCryptoAmount`/`recipientAddress`,
`Job.externalId`/`externalUrl`/`source`, `Company.isActive`/`verified`, and several indexes).

### Change
- `20260220120000` and `20260318120000`: the `Company` / `Job` statements are wrapped in a
  `to_regclass` guard, the same convention as `20260824133200`, `20260824160000`,
  `20260825050000` and `20260825060000`. Statements that only touch a new table (`JobSource`)
  are unchanged. Where the table exists the executed statements are identical.
- New `20260902090100_baseline_schema_completion`: additive and idempotent. Adds the missing
  columns, indexes, the `PaymentIntent` table and its foreign keys. It does not modify data.
- **Intentionally not added:** the unique index `Interview(userId, jobId)`. It sits on an existing
  table and fails if production contains duplicate rows. Add it only after checking production.

### Verification
- Disposable local PostgreSQL 16 (not Production): all 21 migrations applied to an empty database.
  Running them again on the result succeeded. The catalog matched `schema.prisma` except for the
  unique index above.
- GitHub Actions CI on the branch: `prisma migrate deploy` against a fresh `postgres:16` service
  succeeded.
- **Not verified:** the state of Production's `_prisma_migrations` table, and whether Prisma
  accepts a changed file that was already applied. Both must be checked before any deploy.

### Required before any Production deploy (owner approval needed)
1. Take a backup or snapshot of the Production database.
2. Read-only: `prisma migrate status` against Production, to confirm which migrations are applied
   and whether any edited files show as modified.
3. Read-only: check for duplicate `(userId, jobId)` rows in `Interview` before considering the
   unique index.
4. Run the migration in a staging copy of Production first.

### Correction to the section above
The "Production (Vercel + Neon)" build script in this file is **not** what `package.json` does.
The `build` script is `prisma generate && next build`. Nothing in the build applies migrations,
so the Production schema depends on a separate, explicit `prisma migrate deploy` run. Document
that run in the release runbook.

### Stray file
The repository root `migration.sql` (a diverged copy of the `20260318` migration that Prisma never
read) was removed in `240b7c4`.

## Read-only checks before any Production deploy (owner-run, SELECT only)

Nothing below changes data. Run them only in an environment the owner has approved, and record the output.

1. Applied migrations and checksums. Compare with the repo tool
   `node scripts/print-migration-checksums.mjs`:
   ```sql
   SELECT migration_name, checksum, finished_at, rolled_back_at
   FROM _prisma_migrations ORDER BY started_at;
   ```
   Pay attention to `20260220120000_add_company_isActive_verified` and
   `20260318120000_job_ingestion_network`. Their checksums differ between `main` and the branch.
   A failed or rolled-back row blocks `prisma migrate deploy` until it is resolved.
2. Duplicates that would block the unique index in `20260902090100` (expected: zero rows each):
   ```sql
   SELECT "paymentIntentId", count(*) FROM "Transaction"
   WHERE "paymentIntentId" IS NOT NULL GROUP BY 1 HAVING count(*) > 1;

   SELECT "transactionId", count(*) FROM "PaymentIntent"
   WHERE "transactionId" IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
   ```
3. Interview duplicates that would block the planned partial unique index (expected: zero rows):
   ```sql
   SELECT "userId", "jobId", count(*) FILTER (WHERE status = 'scheduled') AS active_rows
   FROM "Interview" GROUP BY "userId", "jobId"
   HAVING count(*) FILTER (WHERE status = 'scheduled') > 1;
   ```
4. Case-insensitive duplicate transaction hashes. The app's duplicate check is case-sensitive, so this
   query shows whether one on-chain payment was recorded more than once (expected: zero rows):
   ```sql
   SELECT lower("txHash") AS hash, count(*) FROM "Transaction"
   WHERE "txHash" IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
   ```
