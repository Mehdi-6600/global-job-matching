#!/usr/bin/env bash
# Read-only diagnostic: summarize how far the live database is from the Prisma
# schema. Prints counts only — never connection strings or row data.
set -uo pipefail

SQL="$(npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script 2>/dev/null || true)"

echo "DIFF_ADD_COLUMNS=$(printf '%s\n' "$SQL" | grep -c 'ADD COLUMN')"
echo "DIFF_CREATE_TABLES=$(printf '%s\n' "$SQL" | grep -c 'CREATE TABLE')"
echo "DIFF_CREATE_INDEXES=$(printf '%s\n' "$SQL" | grep -c 'CREATE.*INDEX')"
echo "DIFF_DROP_COLUMNS=$(printf '%s\n' "$SQL" | grep -c 'DROP COLUMN')"
echo "DIFF_DROP_TABLES=$(printf '%s\n' "$SQL" | grep -c 'DROP TABLE')"
echo "DIFF_DROP_CONSTRAINTS=$(printf '%s\n' "$SQL" | grep -c 'DROP CONSTRAINT')"
echo "DIFF_DROP_INDEXES=$(printf '%s\n' "$SQL" | grep -c 'DROP INDEX')"

echo "--- ADDITIVE ---"
printf '%s\n' "$SQL" | grep -E '^ALTER TABLE .*ADD COLUMN|^CREATE TABLE' | head -20

echo "--- DESTRUCTIVE ---"
printf '%s\n' "$SQL" | grep -E '^ALTER TABLE .*DROP COLUMN|^DROP TABLE' | head -20
