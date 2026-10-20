#!/usr/bin/env bash
#
# Vercel build command.
#
# Deploys used to run `prisma generate && next build`, so migrations were never
# applied and code could ship against an older database. That gap caused the
# 2026-10-20 incident: `/api/jobs` returned 500 because `Job.featured` did not
# exist yet (see docs/DB-MIGRATION-RUNBOOK.md).
#
# Order: generate the client → apply pending migrations → build Next.js.
#
# Safety rules:
#   * Migrations run only when VERCEL_ENV=production. Preview builds share the
#     same DATABASE_URL, and a preview must never write schema to production.
#   * Before writing anything, `prisma migrate status` is inspected. If the
#     database history diverges from prisma/migrations (drift), the build fails
#     immediately and touches nothing. The repair is a reviewed, additive-only
#     script that a human runs: docs/DB-MIGRATION-RUNBOOK.md.
#   * If `migrate deploy` fails, the build fails. Vercel then keeps the current
#     production deployment live, so a bad migration cannot produce a broken
#     release. Escape hatch for a deliberate hotfix: ALLOW_SCHEMA_DRIFT=1.
#
set -uo pipefail

echo "→ prisma generate"
npx prisma generate || exit 1

should_migrate="${VERCEL_ENV:-}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "::warning::DATABASE_URL is not set — skipping migrations"
elif [ "$should_migrate" != "production" ]; then
  echo "→ migrations skipped (VERCEL_ENV=${should_migrate:-unset}; only production applies them)"
else
  echo "→ prisma migrate status (read-only pre-flight)"
  status="$(npx prisma migrate status 2>&1)"
  echo "$status"

  if printf '%s' "$status" | grep -qiE 'last common migration|are different|drift detected'; then
    # Print the machine-readable state last: Vercel keeps only the tail of the
    # build log, so the reason must come after the long Prisma message.
    echo "→ migration history report"
    node scripts/migration-status-report.mjs || true
    echo "::error::Database history diverges from prisma/migrations. Nothing was applied. Repair it with scripts/apply-additive-drift.sh (see docs/DB-MIGRATION-RUNBOOK.md), then redeploy."
    exit 1
  fi

  echo "→ prisma migrate deploy"
  # Prisma takes a Postgres advisory lock (pg_advisory_lock(72707369)) for the
  # duration of a migration run, with a 10s acquisition timeout. Two builds can
  # overlap (a preview and a production deploy, or a cancelled build that has
  # not released its connection yet), and then the deploy fails with
  # "Timed out trying to acquire a postgres advisory lock" even though the
  # database is healthy. That happened once on 2026-10-20 and blocked a release.
  # Lock/connection problems are retried with backoff; a real SQL error is not.
  deploy_log="$(mktemp)"
  attempt=1
  max_attempts=4
  deployed=0
  while [ "$attempt" -le "$max_attempts" ]; do
    if npx prisma migrate deploy 2>&1 | tee "$deploy_log"; then
      deployed=1
      break
    fi
    if grep -qiE 'advisory lock|timed out|P1001|P1002|P1017|ECONNRESET|connection reset' "$deploy_log"; then
      echo "::warning::prisma migrate deploy attempt $attempt/$max_attempts hit lock/connection contention — retrying"
      sleep $((attempt * 15))
      attempt=$((attempt + 1))
      continue
    fi
    break
  done

  if [ "$deployed" = "1" ]; then
    echo "✓ database migrations are applied"
  elif [ "${ALLOW_SCHEMA_DRIFT:-0}" = "1" ]; then
    echo "::warning::prisma migrate deploy failed — continuing because ALLOW_SCHEMA_DRIFT=1"
  else
    echo "→ migration history report"
    node scripts/migration-status-report.mjs || true
    echo "::error::prisma migrate deploy failed. Fix the database (docs/DB-MIGRATION-RUNBOOK.md) or set ALLOW_SCHEMA_DRIFT=1 to deploy anyway."
    exit 1
  fi
fi

echo "→ next build"
npx next build

# Last words in the log: the migration state this build leaves behind. Read-only.
echo "→ migration history after build"
node scripts/migration-status-report.mjs || true
