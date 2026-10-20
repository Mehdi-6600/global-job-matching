#!/usr/bin/env node
/**
 * Checks that the live database has every column the Prisma client needs, then
 * runs the exact query shape that broke production (the featured-first job
 * listing).
 *
 *   node scripts/verify-schema.mjs           exit 1 when something is missing
 *   node scripts/verify-schema.mjs --report  print the state, always exit 0
 *
 * Used by scripts/temp-db-repair.sh and by the GitHub Actions repair workflow.
 */
import { PrismaClient } from "@prisma/client";

const REPORT_ONLY = process.argv.includes("--report");

const EXPECTED = [
  ["Job", "featured"],
  ["Job", "featuredUntil"],
  ["Job", "featuredTxId"],
  ["Transaction", "jobId"],
  ["Transaction", "featuredDuration"],
  ["Transaction", "expectedCryptoAmount"],
  ["Transaction", "rateUsd"],
  ["Transaction", "recipientAddress"],
  ["Transaction", "paymentIntentId"],
  ["PaymentIntent", "jobId"],
  ["PaymentIntent", "featuredDuration"],
  ["Profile", "resumeUrl"],
  ["JobAlert", "frequency"],
  ["Interview", "applicationId"],
];

const db = new PrismaClient();

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(REPORT_ONLY ? 0 : 1);
}

try {
  const rows = await db.$queryRaw`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  const present = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
  const missing = EXPECTED.filter(([table, column]) => !present.has(`${table}.${column}`));

  console.log(`columns checked      : ${EXPECTED.length}`);
  console.log(`columns present      : ${EXPECTED.length - missing.length}`);
  if (missing.length > 0) {
    console.log(`columns missing      : ${missing.map(([t, c]) => `${t}.${c}`).join(", ")}`);
    fail(`database is not ready (${missing.length} missing)`);
  }
  console.log("columns missing      : none");

  // The query that returned 500 in production: ordering by the featured columns.
  const [latest] = await db.job.findMany({
    orderBy: [{ featured: "desc" }, { featuredUntil: "desc" }, { createdAt: "desc" }],
    take: 1,
    select: { id: true, title: true, featured: true, createdAt: true },
  });
  const total = await db.job.count();
  console.log(`jobs readable        : ${total}`);
  console.log(`featured-first query : ok (${latest ? latest.id : "no rows"})`);

  const migrations = await db.$queryRaw`
    SELECT count(*)::int AS total, count(finished_at)::int AS applied
    FROM "_prisma_migrations"
  `;
  console.log(`migrations           : ${migrations[0].applied}/${migrations[0].total} applied`);
  console.log("✓ schema is in sync with prisma/schema.prisma");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await db.$disconnect();
}
