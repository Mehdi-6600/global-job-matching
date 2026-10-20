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

# TEMPORARY (owner-approved, removed in the next commit): apply the reviewed
# additive repair from docs/repair/, because the database console is not
# reachable from the owner's plan. Idempotent; no DROP/DELETE/TRUNCATE.
if [ "${SKIP_TEMP_DB_REPAIR:-0}" != "1" ]; then
  bash scripts/temp-db-repair.sh || exit 1
fi

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
    echo "::error::Database history diverges from prisma/migrations. Nothing was applied. Repair it with scripts/apply-additive-drift.sh (see docs/DB-MIGRATION-RUNBOOK.md), then redeploy."
    exit 1
  fi

  echo "→ prisma migrate deploy"
  if npx prisma migrate deploy; then
    echo "✓ database migrations are applied"
  elif [ "${ALLOW_SCHEMA_DRIFT:-0}" = "1" ]; then
    echo "::warning::prisma migrate deploy failed — continuing because ALLOW_SCHEMA_DRIFT=1"
  else
    echo "::error::prisma migrate deploy failed. Fix the database (docs/DB-MIGRATION-RUNBOOK.md) or set ALLOW_SCHEMA_DRIFT=1 to deploy anyway."
    exit 1
  fi
fi

echo "→ next build"
npx next build
