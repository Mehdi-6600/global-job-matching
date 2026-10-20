#!/usr/bin/env bash
#
# Vercel build command.
#
# Deploys used to run `prisma generate && next build`, so schema migrations were
# never applied and code could ship against an older database. That is exactly
# what broke production on 2026-10-20 (see docs/DB-MIGRATION-RUNBOOK.md).
#
# Order matters:
#   1. generate the client from schema.prisma
#   2. apply pending migrations to the database
#   3. build Next.js
#
# If DATABASE_URL is absent (e.g. a fork without secrets) the migration step is
# skipped. If it is present and `prisma migrate deploy` fails, the build FAILS
# instead of shipping code the database cannot serve. Escape hatch for a
# deliberate hotfix: ALLOW_SCHEMA_DRIFT=1.
#
set -uo pipefail

echo "→ prisma generate"
npx prisma generate || exit 1

if [ -n "${DATABASE_URL:-}" ]; then
  echo "→ prisma migrate deploy"
  if npx prisma migrate deploy; then
    echo "✓ database migrations are applied"
  elif [ "${ALLOW_SCHEMA_DRIFT:-0}" = "1" ]; then
    echo "::warning::prisma migrate deploy failed — continuing because ALLOW_SCHEMA_DRIFT=1"
  else
    echo "::error::prisma migrate deploy failed. Fix the database (docs/DB-MIGRATION-RUNBOOK.md) or set ALLOW_SCHEMA_DRIFT=1 to deploy anyway."
    exit 1
  fi
else
  echo "::warning::DATABASE_URL is not set — skipping migrations"
fi

echo "→ next build"
npx next build
