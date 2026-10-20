#!/usr/bin/env node
/**
 * Compact, read-only report of the Prisma migration history.
 *
 * Why this exists: `prisma migrate status` prints a long message when the
 * database history and `prisma/migrations/` disagree, and Vercel only keeps the
 * tail of a build log. This script prints the same facts in a few short lines
 * so the reason a deploy was blocked is always visible at the end of the log.
 *
 * It never writes to the database and never fails the build: an unreachable
 * database prints "db: unavailable" and exits 0.
 *
 *   node scripts/migration-status-report.mjs           # short report
 *   node scripts/migration-status-report.mjs --full    # no per-list cap
 *
 * Called at the end of scripts/deploy-build.sh, and right before it aborts on a
 * history divergence (docs/DB-MIGRATION-RUNBOOK.md).
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const FULL = process.argv.includes("--full");
const CAP = FULL ? Number.POSITIVE_INFINITY : 12;
const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

function localMigrations() {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter((name) => {
        if (name.startsWith(".")) return false;
        try {
          return statSync(join(MIGRATIONS_DIR, name)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort();
  } catch (error) {
    console.log(`local migrations: unreadable (${error.message})`);
    return null;
  }
}

function list(label, names) {
  if (names.length === 0) return;
  console.log(`${label} (${names.length}):`);
  for (const name of names.slice(0, CAP)) console.log(`  - ${name}`);
  if (names.length > CAP) console.log(`  … ${names.length - CAP} more (rerun with --full)`);
}

const local = localMigrations();
if (local) console.log(`local migrations: ${local.length}`);

const db = new PrismaClient();
let rows;
try {
  rows = await db.$queryRawUnsafe(
    `SELECT migration_name,
            finished_at IS NOT NULL AS finished,
            rolled_back_at IS NOT NULL AS rolled_back
       FROM "_prisma_migrations"
      ORDER BY started_at ASC, migration_name ASC`,
  );
} catch (error) {
  console.log(`db: unavailable (${String(error.message).split("\n")[0].slice(0, 120)})`);
  await db.$disconnect().catch(() => {});
  process.exit(0);
}

await db.$disconnect().catch(() => {});

const applied = new Set(rows.filter((row) => row.finished && !row.rolled_back).map((r) => r.migration_name));
const failed = rows.filter((row) => !row.finished && !row.rolled_back).map((r) => r.migration_name);
const rolledBack = rows.filter((row) => row.rolled_back).map((r) => r.migration_name);

console.log(
  `db rows: ${rows.length}  applied: ${applied.size}  failed: ${failed.length}  rolled back: ${rolledBack.length}`,
);

list("failed", failed);
list("rolled back", rolledBack);

if (!local) process.exit(0);

const notApplied = local.filter((name) => !applied.has(name));
const notInRepo = [...applied].filter((name) => !local.includes(name)).sort();

list("in repo, not applied", notApplied);
list("in db, no repo file", notInRepo);

if (notApplied.length === 0 && notInRepo.length === 0 && failed.length === 0) {
  console.log("verdict: in sync");
} else if (notInRepo.length > 0) {
  console.log("verdict: histories diverge — db has rows with no local migration file");
} else if (failed.length > 0) {
  console.log("verdict: a migration is half-applied (failed row)");
} else {
  console.log("verdict: database is behind — pending migrations can be deployed");
}
