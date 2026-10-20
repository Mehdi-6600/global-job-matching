# Database runbook — schema drift incident (2026-10-20)

## Summary

Production was deployed from `main` for the first time since 2026-10-16
(deployment `dpl_Fs2RswDeWXHXstzuvD5W1EHYDhLE`, commit `008981f`, 2026-10-20 09:01 UTC).
The build is healthy and the new UI is live, **but the database is 22 migrations
behind the Prisma schema**, so every query that reads a `Job` row fails:

| Surface | Observed (live production, 2026-10-20) |
| --- | --- |
| `GET /api/jobs` (+ `?limit=`, `?search=`) | `500 {"error":"Failed to fetch jobs"}` |
| `GET /api/jobs/<id>` | `500 {"error":"Internal server error"}` |
| `/` "Trending opportunities" | "Could not load jobs" |
| `/jobs` | empty list + "Could not load jobs" |
| `/jobs/<id>` | error boundary ("Something went wrong") |
| `/api/cron/verify-payments` (no auth) | `401` ✅ |
| `/api/admin/stats` (no auth) | `401` ✅ |
| `/admin`, `/dashboard`, `/settings`, … | `302 → /login?callbackUrl=…` ✅ |
| 12 locales, `dir=rtl` for fa/ar | ✅ |
| Design tokens, dark theme, fonts, `main-content` landmark | ✅ |
| CSP / HSTS / X-Frame-Options / Referrer-Policy | ✅ |
| `robots.txt`, `sitemaps.xml`, `sitemap/0.xml` | `200` ✅ |

## Root cause (measured, not inferred)

`prisma migrate status` was executed read-only inside the Vercel build, which has
`DATABASE_URL`:

```
23 migrations found in prisma/migrations
Your local migration history and the migrations table from your database are different:
The last common migration is: 20260902090000_production_baseline
The migrations have not yet been applied: …
```

`prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`
reported:

```
ADD COLUMN        12
CREATE TABLE       2
CREATE INDEX      20
DROP COLUMN       12
DROP TABLE         1
DROP CONSTRAINT   ≥2   (e.g. Interview_companyId_fkey, Job_postedById_fkey)
```

Additive drift that the code needs **today**:

```
Job.featured, Job.featuredUntil, Job.featuredTxId
Transaction.expectedCryptoAmount, Transaction.featuredDuration, Transaction.jobId,
Transaction.paymentIntentId, Transaction.rateUsd, Transaction.recipientAddress
Profile.resumeUrl, JobAlert.frequency, Transaction.applicationId
```

Two tables are missing as well (the diff's `CREATE TABLE` statements).

Why the drift never showed up before: `npm run build` was
`prisma generate && next build` — the deploy pipeline never applied migrations,
and the previous production build (`6da5851`, 2026-10-16) predates the `featured`
fields, so it did not touch the missing columns.

The `DROP COLUMN` / `DROP TABLE` entries are leftovers from older schema
versions. **They must never be applied blindly**: a plain `prisma db push` would
delete 12 columns and 1 table.

## Status: repaired (2026-10-20, 10:14 UTC)

The owner could not reach the Neon console on the current plan, so the reviewable
repair was applied through a one-off Vercel build instead (commit `11f53c5`,
reverted in `c04ec2d`; `vercel.json` was never changed for it).

Evidence after the run:

| Check | Result |
| --- | --- |
| `GET /api/jobs?limit=1` | `200`, real payload, `featured`/`featuredUntil`/`featuredTxId` present |
| `pagination.total` | `21435` jobs readable |
| `/jobs` | renders the list (Rental Agent @ Roadsurfer, AI Engineer @ Gain, …) |
| `/jobs/<id>` | `200` |
| `/companies` | `200` with real employers |

`scripts/verify-schema.mjs` is the check that was run before and after: it
asserts all 14 columns exist and executes the featured-first query that used to
return 500. Run it any time with `node scripts/verify-schema.mjs`.

The steps below stay valid for a future database (new environment, restored
backup, staging) — they are the procedure, not a pending action.

## Repair procedure (needs database credentials)

Two ready-to-paste files, no Node install needed (Option 1), plus fallbacks if editing SQL on a phone or a plan limit gets in the way:

| File | What it is |
| --- | --- |
| `docs/repair/01-schema.sql` | The 18 pending migrations, in order, all idempotent. 177 statements: 86 `ALTER TABLE`, 73 `CREATE INDEX IF NOT EXISTS`, 8 `CREATE TABLE IF NOT EXISTS`, 10 guarded `DO` blocks. Zero `DROP` / `DELETE` / `TRUNCATE`. |
| `docs/repair/02-migration-history.sql` | The SQL equivalent of `prisma migrate resolve --applied` for those 18 migrations, with the exact SHA-256 Prisma stores. Idempotent. Run it **after** 01 succeeds. |

### Option 1 — paste into a SQL editor

Run them in the production Postgres SQL editor (Neon / Supabase / Vercel
Postgres), 01 then 02. Take a backup first if the provider offers one.

### Option 2 — GitHub Actions (free, no database plan, no laptop)

The repository is public, so Actions minutes are free and unlimited; the Neon
plan does not matter for that. Add the connection string once as a repository
secret (Settings → Secrets and variables → Actions → `DATABASE_URL`; use Neon's
**direct** host, not the `-pooler` one), then either:

* run `Database repair` from the Actions tab, or
* commit a change to `.github/db-repair-request` (template:
  `.github/db-repair-request.example`).

The workflow applies `01-schema.sql` then `02-migration-history.sql`, prints the
read-only pre-flight state, fails if any expected column is still missing, then
polls `/api/jobs` until it returns 200 and posts the outcome as a commit comment.
It masks the connection string and does nothing when the secret is absent.

### Option 3 — terminal script

The same repair as a script:

```bash
cd global-job-matching
npm ci
export DATABASE_URL="postgresql://…"        # production direct URL

bash scripts/apply-additive-drift.sh              # 1. dry run, inspect the SQL
APPLY=yes bash scripts/apply-additive-drift.sh    # 2. additive statements only
RESOLVE=yes bash scripts/apply-additive-drift.sh  # 3. align the history
bash scripts/apply-additive-drift.sh --verify     # 4. /api/jobs must be 200
```

Expected end state: `prisma migrate status` reports
`Database schema is up to date!` and
`GET https://global-job-matching.vercel.app/api/jobs` returns `200` with a
`"jobs"` array. No redeploy is needed — the running functions pick up the new
columns immediately.

Optional safety net before step 2 (needs `pg_dump`):

```bash
pg_dump "$DATABASE_URL" --no-owner --format=custom -f gjm-$(date +%F).dump
```

## Second defect found while building the repair

Four columns existed in `prisma/schema.prisma` but in **no** migration:

```
PaymentIntent.jobId, PaymentIntent.featuredDuration,
Transaction.jobId,   Transaction.featuredDuration
```

The Prisma client selects them, the database does not have them, and no
`migrate deploy` would ever create them — so the drift was self-renewing.
`prisma/migrations/20261020030000_add_payment_intent_links/migration.sql` adds
them with `ADD COLUMN IF NOT EXISTS` plus guarded foreign keys, and is included
in `docs/repair/01-schema.sql`.

## Third defect: `JobSource` had no creator

`JobSource` is created by `20260318120000_job_ingestion_network`, which predates
`production_baseline`, and the baseline does not re-create it. Several later
migrations add indexes to it **outside** any guard, so on a database that never
ran the March migration those statements error out. `20261020040000_add_job_source_table`
creates the table and every column idempotently and is emitted as the prelude of
`docs/repair/01-schema.sql`.

## Proof the repair works

The two repair files were executed against a throwaway PostgreSQL 17 instance
created with `pgserver`, starting from `production_baseline` only:

* pass 1 and pass 2: **0 error lines** (idempotent),
* afterwards: 0 tables and 0 columns from `schema.prisma` are missing,
  148 indexes present,
* `_prisma_migrations` holds baseline + 18 rows, all with `finished_at`.

A local audit also confirms that every scalar field in `schema.prisma` is
created by at least one migration (0 gaps).

## Payment sweep without a paid plan

The 10-minute payment verification can no longer live in `vercel.json` (that is
what caused the outage). It now runs in-process, driven by ordinary requests,
with a database lease so it happens at most once per 10 minutes across all
instances. New migration `20261020050000_add_sweep_state` adds the lease table
(idempotent), and `deploy-build.sh` applies it automatically. Full description:
`docs/PAYMENT-SWEEP.md`.

## Prevent recurrence (in this PR)

`vercel.json` now uses `bash scripts/deploy-build.sh`:

1. `prisma generate`
2. read-only `prisma migrate status` pre-flight — if the database history
   diverges from `prisma/migrations`, the build **stops without touching the
   database** and prints the runbook path
3. `prisma migrate deploy` — fails the build if a migration cannot be applied
   (`ALLOW_SCHEMA_DRIFT=1` is the explicit escape hatch)
4. `next build`

Migrations run **only when `VERCEL_ENV=production`**. Preview deployments share
the same `DATABASE_URL`, so they never write schema. A failed build also never
replaces the live deployment: Vercel keeps serving the previous one.

Merge this PR **after** step 3 above. If it is merged earlier, production keeps
running the current deployment and the next deploy stops at the pre-flight with
`Database history diverges…` — no downtime, no data loss, just no new release.

Because the build fails closed, code can no longer ship against an older
database, which is how the 500s reached production in the first place.

## Rollback

Previous known-good production deployment:
`dpl_4AxyAAF5pkAm89CXL8GRhVSoMXBR` (commit `6da5851`, 2026-10-16).
Promote it from Vercel → Deployments → ⋯ → Promote to Production. It predates the
`featured` fields and therefore works against the current database.
