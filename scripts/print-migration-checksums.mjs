#!/usr/bin/env node
/**
 * Deterministic checksums for Prisma migration folders.
 * Usage: node scripts/print-migration-checksums.mjs
 *
 * Walks prisma/migrations/*/migration.sql and prints
 * SHA-256 of each file contents (UTF-8) + path, sorted by folder name.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "prisma", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  } catch (err) {
    console.error(
      `Cannot read migrations dir: ${MIGRATIONS_DIR}\n`,
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }

  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();

  if (dirs.length === 0) {
    console.log("No migration directories found.");
    return;
  }

  const rows = [];

  for (const dir of dirs) {
    const sqlPath = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    try {
      const st = await stat(sqlPath);
      if (!st.isFile()) continue;
      const body = await readFile(sqlPath);
      const hash = createHash("sha256").update(body).digest("hex");
      rows.push({ dir, hash, bytes: body.length });
    } catch {
      rows.push({ dir, hash: null, bytes: 0, missing: true });
    }
  }

  // Stable table output for CI diffing
  console.log("Prisma migration checksums (SHA-256 of migration.sql)");
  console.log("=".repeat(72));
  for (const r of rows) {
    if (r.missing) {
      console.log(`${r.dir}\tMISSING migration.sql`);
    } else {
      console.log(`${r.dir}\t${r.hash}\t${r.bytes} bytes`);
    }
  }
  console.log("=".repeat(72));
  console.log(`Total: ${rows.filter((r) => !r.missing).length} migration(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
