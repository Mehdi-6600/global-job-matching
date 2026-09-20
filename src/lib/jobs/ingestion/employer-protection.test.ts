/**
 * Employer protection tests.
 *
 * Imported ingestion MUST NOT mutate employer-owned jobs
 * (postedById != null). This is a hard invariant of the pipeline.
 *
 * Strategy: mock the database so that any updateMany() targeting an
 * employer job returns { count: 0 }, and assert that the pipeline
 * records the attempt as a skip/duplicate without touching the row.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JobSourceAdapter } from "./types";

/* ------------------------------------------------------------------ */
/* Mock database with a marker: any updateMany that would touch an    */
/* employer job is recorded and returns count=0.                      */
/* ------------------------------------------------------------------ */

const updateManyCalls: Array<{ where: unknown; data: unknown }> = [];
let findFirstResult: unknown = null;

vi.mock("@/lib/db", () => ({
  db: {
    jobSource: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    job: {
      findFirst: vi.fn(async () => findFirstResult),
      create: vi.fn(async () => {
        throw new Error("should_not_create_for_employer_job");
      }),
      updateMany: vi.fn(
        async (args: { where: unknown; data: unknown }) => {
          updateManyCalls.push(args);
          // Simulate: the row was employer-owned, so 0 rows matched.
          return { count: 0 };
        },
      ),
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    company: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "c1" })),
    },
    jobSourceListing: {
      upsert: vi.fn(async () => ({})),
      findUnique: vi.fn(async () => null),
    },
  },
}));

vi.mock("./source-run", () => ({
  recordSourceRun: vi.fn(async () => undefined),
}));

vi.mock("./absence-freshness", () => ({
  applyAbsenceFreshness: vi.fn(async () => ({ updated: 0 })),
}));

/* ------------------------------------------------------------------ */
/* Fake adapter that returns the "employer-looking" draft.            */
/* ------------------------------------------------------------------ */

const employerDraft = {
  sourceKey: "fake",
  sourceJobId: "slug-1",
  externalId: "fake:slug-1",
  title: "Existing Employer Role",
  company: "Employer Co",
  location: "Berlin, Germany",
  description: "A sufficiently long description for the quality gate.",
  descriptionIsSnippet: false,
  applyUrl: "https://example.com/apply",
  externalUrl: "https://example.com/job",
  remote: false,
  employmentType: "full-time",
  tags: ["react"],
  skills: ["react"],
  publishedAt: new Date(),
  attribution: "Jobs via Fake",
};

let fakeAdapter: JobSourceAdapter;

vi.mock("./registry", async () => {
  const actual = await vi.importActual<typeof import("./registry")>(
    "./registry",
  );
  return {
    ...actual,
    getRunnableSources: vi.fn(async () => [
      {
        key: "fake",
        name: "Fake",
        type: "test",
        baseUrl: "https://example.test",
        licenseStatus: "APPROVED" as const,
        commercialAllowed: true,
        redistributionAllowed: true,
        attributionRequired: false,
        enabled: true,
        refreshIntervalMinutes: 60,
        notes: "",
        adapter: fakeAdapter,
      },
    ]),
  };
});

vi.mock("./source-lease", () => ({
  tryAcquireSourceLease: vi.fn(async (key: string) => ({
    sourceKey: key,
    ownerToken: "test-owner",
    leaseMs: 60_000,
  })),
  renewSourceLease: vi.fn(async () => true),
  releaseSourceLease: vi.fn(async () => true),
}));

vi.mock("./rate-limit", () => ({
  tryAcquireSourceQuota: vi.fn(() => true),
}));

/* Import AFTER the mocks. */
import { runIngestion } from "./pipeline";

beforeEach(() => {
  updateManyCalls.length = 0;
  findFirstResult = null;
  fakeAdapter = {
    key: "fake",
    async fetchPage() {
      return {
        jobs: [employerDraft],
        hasMore: false,
        fetched: 1,
        errors: [],
        nextCursor: null,
      };
    },
  };
});

describe("employer protection invariant", () => {
  it("never creates a new job when a matching employer job exists", async () => {
    // The dedup lookup finds an existing employer-owned job.
    findFirstResult = {
      id: "emp-job-1",
      externalId: "fake:slug-1",
      externalUrl: "https://example.com/job",
      applyUrl: "https://example.com/apply",
      title: "Existing Employer Role",
      location: "Berlin, Germany",
      postedById: "employer-1", // employer-owned
      description: "A sufficiently long description.",
      type: "full-time",
      remote: false,
      salary: null,
      company: { name: "Employer Co" },
    };

    const stats = await runIngestion({ sourceKeys: ["fake"], maxPages: 1 });
    const s = stats.find((x) => x.sourceKey === "fake");

    expect(s).toBeDefined();
    // The pipeline must not have created a job.
    expect(s!.created).toBe(0);
    // updateMany was called with a where-clause that excluded employer jobs.
    for (const call of updateManyCalls) {
      const where = call.where as { postedById?: unknown };
      if (where && "postedById" in where) {
        expect(where.postedById).toBe(null);
      }
    }
  });

  it("reports a duplicate/skip when the only match is employer-owned", async () => {
    findFirstResult = {
      id: "emp-job-1",
      externalId: "fake:slug-1",
      externalUrl: "https://example.com/job",
      applyUrl: "https://example.com/apply",
      title: "Existing Employer Role",
      location: "Berlin, Germany",
      postedById: "employer-1",
      description: "A sufficiently long description.",
      type: "full-time",
      remote: false,
      salary: null,
      company: { name: "Employer Co" },
    };

    const stats = await runIngestion({ sourceKeys: ["fake"], maxPages: 1 });
    const s = stats.find((x) => x.sourceKey === "fake");
    expect(s).toBeDefined();
    // Either skipped or duplicate — not created.
    expect(s!.created).toBe(0);
    expect(s!.skipped + s!.duplicates).toBeGreaterThanOrEqual(1);
  });
});
