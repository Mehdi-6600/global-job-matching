/**
 * Concurrent job-create race: free plan allows maxActiveJobsEmployer = 1.
 * Two overlapping creates must not both succeed past the limit.
 *
 * Requires DATABASE_URL (CI ephemeral Postgres). Skips locally if unset.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createJobForUser } from "@/services/jobs/create-job";
import { countActiveJobsForUser } from "@/services/jobs/active-job-limit";

const DATABASE_URL = process.env.DATABASE_URL;
const run = Boolean(DATABASE_URL) && process.env.SKIP_INTEGRATION !== "1";

const jobBody = {
  title: "Concurrent Test Role",
  description:
    "This is a sufficiently long job description for validation rules.",
  location: "Remote",
  type: "Full-time",
  companyName: "Concurrency Test Co",
};

describe.skipIf(!run)("concurrent job creation (integration)", () => {
  const db = new PrismaClient();
  let userId = "";

  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email: `concurrent-${Date.now()}@example.com`,
        name: "Concurrent Employer",
        role: "EMPLOYER",
        plan: "free",
        password: "unused-hash",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await db.job.deleteMany({ where: { postedById: userId } });
      await db.company.deleteMany({ where: { ownerId: userId } });
      await db.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("allows at most one active job for free plan under parallel creates", async () => {
    const actor = {
      id: userId,
      role: "EMPLOYER",
      email: "concurrent@example.com",
    };

    const [a, b] = await Promise.all([
      createJobForUser(actor, jobBody),
      createJobForUser(actor, { ...jobBody, title: "Concurrent Test Role B" }),
    ]);

    const successes = [a, b].filter((r) => r.ok);
    const failures = [a, b].filter((r) => !r.ok);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    if (!failures[0].ok) {
      expect(failures[0].code).toBe("PLAN_LIMIT_JOBS");
      expect(failures[0].limit).toBe(1);
    }

    const active = await countActiveJobsForUser(db, userId);
    expect(active).toBe(1);
  });
});
