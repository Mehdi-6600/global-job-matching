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

## Repair (owner step — needs database credentials)

```bash
cd global-job-matching
npm ci
export DATABASE_URL="postgresql://…"        # production direct URL

# 1. dry run: inspect what will be added, nothing is executed
bash scripts/apply-additive-drift.sh

# 2. apply only ADD COLUMN / CREATE TABLE / CREATE INDEX / ADD CONSTRAINT
APPLY=yes bash scripts/apply-additive-drift.sh

# 3. mark the migrations the database already satisfies as applied
RESOLVE=yes bash scripts/apply-additive-drift.sh

# 4. verify the live API
bash scripts/apply-additive-drift.sh --verify
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

## Prevent recurrence (in this PR)

`vercel.json` now uses `bash scripts/deploy-build.sh`:

1. `prisma generate`
2. `prisma migrate deploy` — **fails the build** if the schema cannot be applied
   (`ALLOW_SCHEMA_DRIFT=1` is the explicit escape hatch)
3. `next build`

Because the build fails closed, code can no longer ship against an older
database. Merge this PR **after** step 3 above, otherwise the next deployment
will stop at `migrate deploy` (production keeps serving the current deployment,
it does not go down).

## Rollback

Previous known-good production deployment:
`dpl_4AxyAAF5pkAm89CXL8GRhVSoMXBR` (commit `6da5851`, 2026-10-16).
Promote it from Vercel → Deployments → ⋯ → Promote to Production. It predates the
`featured` fields and therefore works against the current database.
