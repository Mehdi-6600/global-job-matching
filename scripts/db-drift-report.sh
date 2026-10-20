#!/usr/bin/env bash
# Read-only diagnostic: summarize how far the live database is from the Prisma
# schema. Prints counts and object names only — never connection strings.
set -uo pipefail

SQL="$(npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script 2>/dev/null || true)"

ADD_COLS="$(printf '%s\n' "$SQL" | grep 'ADD COLUMN' | sed -E 's/ALTER TABLE "([^"]+)" ADD COLUMN "([^"]+)".*/\1.\2/' | tr '\n' ' ')"
NEW_TABLES="$(printf '%s\n' "$SQL" | grep 'CREATE TABLE' | sed -E 's/CREATE TABLE "([^"]+)".*/\1/' | tr '\n' ' ')"
DROP_COLS="$(printf '%s\n' "$SQL" | grep 'DROP COLUMN' | sed -E 's/ALTER TABLE "([^"]+)" DROP COLUMN "([^"]+)".*/\1.\2/' | tr '\n' ' ')"
DROP_TABLES="$(printf '%s\n' "$SQL" | grep 'DROP TABLE' | sed -E 's/DROP TABLE "([^"]+)".*/\1/' | tr '\n' ' ')"

echo "DRIFT_ADD_COLS_12=$ADD_COLS"
echo "DRIFT_NEW_TABLES=$NEW_TABLES"
echo "DRIFT_DROP_COLS=$DROP_COLS"
echo "DRIFT_DROP_TABLES=$DROP_TABLES"
