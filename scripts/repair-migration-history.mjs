#!/usr/bin/env node
/**
 * Repairs one specific, verifiable kind of Prisma migration-history damage:
 * rows in `_prisma_migrations` whose `migration_name` is a PREFIX of exactly one
 * real migration in `prisma/migrations/`.
 *
 * Why this can happen: the 2026-10-20 drift repair was applied through a
 * one-off build. The history rows it wrote ended up shortened (for example
 * `20260905120000_ensur` instead of `20260905120000_ensure_integrity`), so
 * Prisma reports "the migrations from the database are not found locally" and
 * refuses to run `migrate deploy` — every deploy then fails, even though the
 * schema itself is correct.
 *
 * What it does: renames those rows to the full names. That is the only change,
 * it is a rename (nothing is deleted, no business table is touched), and it is
 * only attempted when the mapping is unambiguous:
 *
 *   - the stored name must be a prefix of exactly ONE local migration,
 *   - no row may already use that full name,
 *   - two damaged rows may not resolve to the same migration.
 *
 * Anything else is reported and the script exits 1 WITHOUT writing. All changes
 * run in a single transaction.
 *
 *   node scripts/repair-migration-history.mjs           # dry run, prints the plan
 *   node scripts/repair-migration-history.mjs --apply   # applies the plan
 *
 * Called by scripts/deploy-build.sh only when `prisma migrate status` reports a
 * divergence. See docs/DB-MIGRATION-RUNBOOK.md.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

export function localMigrationNames(dir = MIGRATIONS_DIR) {
  return readdirSync(dir)
    .filter((name) => {
      if (name.startsWith(".")) return false;
      try {
        return statSync(join(dir, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}

/**
 * Pure planner: decides which history rows may be renamed.
 *
 * @param {{ id: string, migration_name: string, finished: boolean, rolled_back: boolean }[]} rows
 * @param {string[]} localNames
 * @returns {{ renames: { id: string, from: string, to: string }[], problems: { from: string, reason: string }[] }}
 */
export function planHistoryRepair(rows, localNames) {
  const local = new Set(localNames);
  const taken = new Set(rows.map((row) => row.migration_name));
  const renames = [];
  const problems = [];

  for (const row of rows) {
    const from = row.migration_name;
    if (local.has(from)) continue;

    if (!row.finished || row.rolled_back) {
      problems.push({ from, reason: "row is failed or rolled back — resolve it by hand" });
      continue;
    }

    const candidates = localNames.filter((name) => from.length > 0 && name.startsWith(from));
    if (candidates.length === 0) {
      problems.push({ from, reason: "no migration in prisma/migrations starts with this name" });
      continue;
    }
    if (candidates.length > 1) {
      problems.push({ from, reason: `ambiguous — ${candidates.length} migrations start with it` });
      continue;
    }

    const to = candidates[0];
    if (taken.has(to)) {
      problems.push({ from, reason: `a history row for ${to} already exists` });
      continue;
    }

    taken.add(to);
    renames.push({ id: row.id, from, to });
  }

  return { renames, problems };
}

async function main() {
  const apply = process.argv.includes("--apply");

  let localNames;
  try {
    localNames = localMigrationNames();
  } catch (error) {
    console.log(`✗ cannot read prisma/migrations: ${error.message}`);
    process.exit(1);
  }

  // Imported lazily so the planner above stays unit-testable without a database.
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();

  let rows;
  try {
    rows = await db.$queryRawUnsafe(
      `SELECT id,
              migration_name,
              finished_at IS NOT NULL AS finished,
              rolled_back_at IS NOT NULL AS rolled_back
         FROM "_prisma_migrations"
        ORDER BY started_at ASC, migration_name ASC`,
    );
  } catch (error) {
    console.log(`✗ cannot read _prisma_migrations: ${String(error.message).split("\n")[0]}`);
    await db.$disconnect().catch(() => {});
    process.exit(1);
  }

  const { renames, problems } = planHistoryRepair(rows, localNames);

  if (problems.length > 0) {
    console.log(`✗ history needs a human: ${problems.length} unresolved row(s), nothing was changed`);
    for (const problem of problems.slice(0, 10)) {
      console.log(`   ${problem.from} — ${problem.reason}`);
    }
    await db.$disconnect().catch(() => {});
    process.exit(1);
  }

  if (renames.length === 0) {
    console.log("✓ migration history needs no repair");
    await db.$disconnect().catch(() => {});
    process.exit(0);
  }

  if (!apply) {
    console.log(`would rename ${renames.length} history row(s):`);
    for (const rename of renames) console.log(`   ${rename.from} → ${rename.to}`);
    await db.$disconnect().catch(() => {});
    process.exit(0);
  }

  try {
    await db.$transaction(
      renames.map((rename) =>
        db.$executeRawUnsafe(
          `UPDATE "_prisma_migrations" SET migration_name = $1 WHERE id = $2`,
          rename.to,
          rename.id,
        ),
      ),
    );
  } catch (error) {
    console.log(`✗ rename failed, nothing was committed: ${String(error.message).split("\n")[0]}`);
    await db.$disconnect().catch(() => {});
    process.exit(1);
  }

  console.log(`✓ renamed ${renames.length} migration-history row(s) to their full names`);
  for (const rename of renames) console.log(`   ${rename.from} → ${rename.to}`);

  await db.$disconnect().catch(() => {});
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
