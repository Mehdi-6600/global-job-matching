import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Deployment-config guard.
 *
 * Vercel's Hobby plan only accepts cron jobs that run at most once per day.
 * A single sub-daily expression (for example `*\/10 * * * *`) makes the whole
 * production deployment fail with:
 *
 *   "Hobby accounts are limited to daily cron jobs. This cron expression
 *    would run more than once per day."
 *
 * That happened on 2026-10-18 and blocked every deploy for two days, so this
 * test keeps the schedule honest. Sub-hour cadences belong in
 * `.github/workflows/verify-payments-cron.yml`, not in vercel.json.
 */

type VercelCron = { path: string; schedule: string };

const ROOT = process.cwd();

function readCrons(): VercelCron[] {
  const raw = readFileSync(join(ROOT, "vercel.json"), "utf8");
  const parsed = JSON.parse(raw) as { crons?: VercelCron[] };
  return parsed.crons ?? [];
}

/** A schedule can run at most once per day only when minute and hour are fixed. */
function runsAtMostOncePerDay(schedule: string): boolean {
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const [minute, hour] = fields;
  const fixed = /^\d{1,2}$/;
  return fixed.test(minute) && fixed.test(hour);
}

describe("vercel.json cron configuration", () => {
  it("declares at least one cron job", () => {
    expect(readCrons().length).toBeGreaterThan(0);
  });

  it("uses unique paths", () => {
    const paths = readCrons().map((cron) => cron.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("keeps every cron at a daily-or-slower cadence (Hobby plan limit)", () => {
    const offenders = readCrons()
      .filter((cron) => !runsAtMostOncePerDay(cron.schedule))
      .map((cron) => `${cron.path} → "${cron.schedule}"`);

    expect(offenders).toEqual([]);
  });

  it("keeps the payment verification backstop scheduled", () => {
    const paths = readCrons().map((cron) => cron.path);
    expect(paths).toContain("/api/cron/verify-payments");
  });
});

/**
 * Deploys used to run `next build` without applying migrations, so code could
 * ship against an older database. That gap produced the 2026-10-20 outage:
 * `/api/jobs` returned 500 because `Job.featured` did not exist yet.
 * `scripts/deploy-build.sh` runs `prisma migrate deploy` (fail-closed) before
 * `next build`, so this test keeps that wiring in place.
 */
describe("vercel.json build command", () => {
  function readConfig(): { buildCommand?: string } {
    return JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as {
      buildCommand?: string;
    };
  }

  it("runs the migration-aware build script", () => {
    expect(readConfig().buildCommand).toBe("bash scripts/deploy-build.sh");
  });

  it("ships the build script it references", () => {
    const script = readFileSync(join(ROOT, "scripts/deploy-build.sh"), "utf8");
    expect(script).toContain("prisma migrate deploy");
    expect(script).toContain("next build");
    // A failed migration must stop the deploy instead of shipping a broken app.
    expect(script).toContain("exit 1");
  });
});
