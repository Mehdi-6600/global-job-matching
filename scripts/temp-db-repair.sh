#!/usr/bin/env bash
#
# TEMPORARY — one-shot schema repair, run from a Vercel build.
#
# The owner cannot reach the database console (plan limit) and approved running
# the repair from here instead. This script exists only for one deployment and
# is removed in the very next commit.
#
# It applies the same two files the runbook hands to a human:
#   docs/repair/01-schema.sql            (idempotent, no DROP/DELETE/TRUNCATE)
#   docs/repair/02-migration-history.sql (records the migrations as applied)
# then verifies the result against the Prisma client.
#
set -uo pipefail

echo "== TEMP db repair =="

if [ -z "${DATABASE_URL:-}" ]; then
  echo "::error::DATABASE_URL is not set — aborting, nothing was applied."
  exit 1
fi

echo "→ state before"
node scripts/verify-schema.mjs --report || true

echo "→ applying 01-schema.sql"
npx prisma db execute --url "$DATABASE_URL" --file docs/repair/01-schema.sql || {
  echo "::error::01-schema.sql failed"
  exit 1
}
echo "✓ schema statements applied"

echo "→ applying 02-migration-history.sql"
npx prisma db execute --url "$DATABASE_URL" --file docs/repair/02-migration-history.sql || {
  echo "::error::02-migration-history.sql failed"
  exit 1
}
echo "✓ migration history recorded"

echo "→ state after"
node scripts/verify-schema.mjs || {
  echo "::error::schema verification failed"
  exit 1
}
echo "✓ repair verified"
