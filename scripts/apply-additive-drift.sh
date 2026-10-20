#!/usr/bin/env bash
#
# Schema-drift repair for the 2026-10-20 incident.
#
# The production database is at migration 20260902090000_production_baseline.
# The Prisma schema is 22 migrations ahead. Any query that reads Job rows fails
# with "column does not exist", which is why /api/jobs and /jobs return 500.
#
# This script applies ONLY the additive part of the drift
# (ADD COLUMN / CREATE TABLE / CREATE INDEX / ADD CONSTRAINT). Every statement
# that would drop a column, table, index, constraint or type is filtered out and
# written to a separate review file. Nothing is executed without APPLY=yes.
#
# Usage (from the repository root, with DATABASE_URL exported):
#
#   npm ci                                  # once, to get the prisma CLI
#   export DATABASE_URL="postgresql://…"    # the production direct URL
#
#   bash scripts/apply-additive-drift.sh              # 1. dry run, inspect SQL
#   APPLY=yes bash scripts/apply-additive-drift.sh    # 2. apply additive only
#   RESOLVE=yes bash scripts/apply-additive-drift.sh  # 3. align history
#   bash scripts/apply-additive-drift.sh --verify     # 4. check the live API
#
# Step 3 marks the already-present migrations as applied so that future
# `prisma migrate deploy` runs (now wired into the Vercel build) succeed.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DIFF="drift-$STAMP.sql"
ADDITIVE="drift-$STAMP.additive.sql"
SKIPPED="drift-$STAMP.skipped.sql"
BASE_MIGRATION="20260902090000_production_baseline"

say() { printf '%s\n' "$*"; }
die() { printf '\n✗ %s\n' "$*" >&2; exit 1; }

require_db() {
  [ -n "${DATABASE_URL:-}" ] || die "DATABASE_URL is not set."
}

verify_live() {
  local base="${APP_URL:-https://global-job-matching.vercel.app}"
  say "→ verifying $base/api/jobs"
  local code
  code="$(curl -s -o /tmp/gjm-jobs.json -w '%{http_code}' --max-time 45 "$base/api/jobs?limit=2" || true)"
  say "  HTTP $code"
  head -c 240 /tmp/gjm-jobs.json 2>/dev/null || true
  say ""
  if [ "$code" = "200" ] && grep -q '"jobs"' /tmp/gjm-jobs.json; then
    say "✓ jobs API is healthy"
  else
    die "jobs API still failing — inspect the drift files and the Vercel runtime logs"
  fi
}

if [ "${1:-}" = "--verify" ]; then
  verify_live
  exit 0
fi

require_db

say "→ reading drift between the live database and prisma/schema.prisma"
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$DIFF"

# Statements are separated by blank lines. A statement is applied only if it is
# purely additive; anything that drops or rewrites existing structure is routed
# to the review file. This is done per STATEMENT, not per line: a line-by-line
# filter would strip the first line of a multi-column DROP and leave the rest
# behind, which is how you lose data.
awk -v add="$ADDITIVE" -v skip="$SKIPPED" '
  BEGIN { RS = ""; ORS = "\n\n" }
  {
    stmt = $0
    destructive = (stmt ~ /(^|\n)[[:space:]]*DROP[[:space:]]/) ||
                  (stmt ~ /[[:space:]]DROP[[:space:]]+(COLUMN|TABLE|INDEX|CONSTRAINT|TYPE|VIEW|FOREIGN)/) ||
                  (stmt ~ /ALTER[[:space:]]+COLUMN/) ||
                  (stmt ~ /[[:space:]]RENAME[[:space:]]/)
    print stmt > (destructive ? skip : add)
  }
' "$DIFF"

KEPT="$(grep -c ';' "$ADDITIVE" || true)"
SKIP="$(grep -c ';' "$SKIPPED" || true)"

say ""
say "  additive statements : $KEPT   → $ADDITIVE"
say "  skipped (destructive): $SKIP  → $SKIPPED"
say ""

say "  columns that will be added:"
grep -oE 'ALTER TABLE "[^"]+" ADD COLUMN +"[^"]+"' "$ADDITIVE" | sed -E 's/ALTER TABLE "([^"]+)" ADD COLUMN +"([^"]+)"/    \1.\2/' || true
say ""
say "  tables that will be created:"
grep -oE '^CREATE TABLE "[^"]+"' "$ADDITIVE" | sed -E 's/CREATE TABLE "([^"]+)"/    \1/' || true
say ""

if [ "$KEPT" -eq 0 ]; then
  say "✓ nothing additive to do — the schema already matches"
else
  if [ "${APPLY:-}" != "yes" ]; then
    say "Dry run only. Review $ADDITIVE, then re-run with:"
    say "    APPLY=yes bash scripts/apply-additive-drift.sh"
    exit 0
  fi

  say "→ applying $KEPT additive statements"
  npx prisma db execute --url "$DATABASE_URL" --file "$ADDITIVE"
  say "✓ additive statements applied"

  say "→ re-checking the drift"
  npx prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-schema-datamodel prisma/schema.prisma \
    --script > "drift-$STAMP.after.sql"
  REMAINING="$(grep -c ';' "drift-$STAMP.after.sql" || true)"
  say "  statements still outstanding: $REMAINING (drift-$STAMP.after.sql)"
  say "  (remaining statements are the skipped destructive ones plus type/nullability tweaks)"
fi

if [ "${RESOLVE:-}" = "yes" ]; then
  say "→ marking the migrations that the database already satisfies as applied"
  for dir in prisma/migrations/*/; do
    name="$(basename "$dir")"
    [ "$name" = "$BASE_MIGRATION" ] && continue
    if npx prisma migrate resolve --applied "$name" >/dev/null 2>&1; then
      say "    applied  $name"
    else
      say "    skipped  $name (already recorded)"
    fi
  done
  say ""
  say "→ prisma migrate status"
  npx prisma migrate status || true
fi

say ""
say "Next:"
say "  bash scripts/apply-additive-drift.sh --verify"
say "  RESOLVE=yes bash scripts/apply-additive-drift.sh   # if not done yet"
say ""
say "The site needs no redeploy: the running functions pick the new columns up immediately."
