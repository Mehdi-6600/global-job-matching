# Database migration runbook (incident 2026-10-20)

## What happened

Production was deployed successfully for the first time since 2026-10-16
(`main` @ `008981f`, deployment `dpl_Fs2RswDeWXHXstzuvD5W1EHYDhLE`). The new
build includes everything merged after the previous production release, and it
queries columns that the **live database does not have**.

Result on <https://global-job-matching.vercel.app>:

| Surface | Result |
| --- | --- |
| `/api/jobs`, `/api/jobs/<id>` | `500` (`{"error":"Failed to fetch jobs"}`) |
| `/`, `/jobs` job lists | "Could not load jobs" |
| `/jobs/<id>` | error boundary |
| `/admin`, `/dashboard`, `/settings`, … | correctly redirect to `/login` |
| Locales, RTL, design tokens, SEO, headers | all fine |

## Root cause (measured, not guessed)

A read-only `prisma migrate status` executed inside the Vercel build (which has
`DATABASE_URL`) reported:

```
23 migrations found in prisma/migrations
Your local migration history and the migrations table from your database are different:
The last common migration is: 20260902090000_production_baseline
The migrations have not yet been applied: …
```

So the database is at the **September 2 baseline**; the 22 later migrations were
never applied. Schema changes have historically been pushed with `db push`
instead, which is why most tables already exist but a few objects do not.

`prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`:

```
ADD COLUMN        12
CREATE TABLE       2
CREATE INDEX      20
DROP COLUMN       12
DROP TABLE         1
```

Missing (additive) columns include:

```
Job.featured, Job.featuredTxId, Job.featuredUntil
Transaction.expectedCryptoAmount, Transaction.featuredDuration, Transaction.jobId,
Transaction.paymentIntentId, Transaction.rateUsd, Transaction.recipientAddress
Profile.resumeUrl, JobAlert.frequency, <one more "applicationId">
```

The `DROP COLUMN` / `DROP TABLE` entries are historical drift (columns that the
current schema no longer models). **They must not be applied blindly** — a plain
`prisma db push` would drop 12 columns and 1 table.

## Fix (owner approval required)

The deploy pipeline never runs migrations: `npm run build` is
`prisma generate && next build`. `build:migrate` exists but is not wired into
Vercel.

### Step 1 — backup

```bash
pg_dump "$DATABASE_URL" --no-owner --format=custom -f gjm-$(date +%F).dump
```

### Step 2 — apply the additive statements only

Use the diff as the source of truth, keep `ADD COLUMN` / `CREATE TABLE` /
`CREATE INDEX`, drop every `DROP …` line, then execute the result:

```bash
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > drift.sql

grep -vE '^-- Drop|^ALTER TABLE .*DROP|^DROP (TABLE|INDEX|TYPE)' drift.sql > additive.sql
psql "$DATABASE_URL" -f additive.sql
```

Because every recent migration is written with `IF NOT EXISTS`, re-running the
same script is safe.

### Step 3 — verify

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://global-job-matching.vercel.app/api/jobs
curl -s https://global-job-matching.vercel.app/api/jobs | head -c 200
```

Expected: `200` and a JSON body containing `"jobs"`. No redeploy is needed —
the running functions pick the columns up immediately.

### Step 4 — align migration history (optional but recommended)

Once the schema matches, mark the historical migrations as applied so future
`migrate deploy` runs are meaningful:

```bash
for m in $(ls prisma/migrations | grep -v 20260902090000_production_baseline); do
  npx prisma migrate resolve --applied "$m" || true
done
npx prisma migrate status
```

## Prevent recurrence

Either run migrations as part of the deploy (Vercel → Project → Settings →
Build & Development Command → `npm run build:migrate`, or set
`"buildCommand": "npm run build:migrate"` in `vercel.json`) **after** Step 4, or
add a CI job that fails when `prisma migrate status` reports pending migrations
against a staging database.

## Rollback

The previous production deployment is `dpl_4AxyAAF5pkAm89CXL8GRhVSoMXBR`
(commit `6da5851`, 2026-10-16). Promote it from the Vercel dashboard
(Deployments → … → Promote to Production) if the schema fix has to wait. It
predates the `featured` fields and works against the current database.
