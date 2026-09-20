/**
 * Source isolation tests.
 *
 * A failing source must not stop the pipeline from processing other
 * sources. Each source runs independently with its own lease, quota,
 * circuit, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JobSourceAdapter } from "./types";

/* ------------------------------------------------------------------ */
/* Mock database with no-op implementations.                          */
/* ------------------------------------------------------------------ */

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
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "j1" })),
      updateMany: vi.fn(async () => ({ count: 0 })),
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
/* Two adapters: one throws, one succeeds.                            */
/* ------------------------------------------------------------------ */

let goodAdapter: JobSourceAdapter;
let badAdapter: JobSourceAdapter;

vi.mock("./registry", async () => {
  const actual = await vi.importActual<typeof import("./registry")>(
    "./registry",
  );
  return {
    ...actual,
    getRunnableSources: vi.fn(async () => [
      {
        key: "bad",
        name: "Bad",
        type: "test",
        baseUrl: "https://bad.test",
        licenseStatus: "APPROVED" as const,
        commercialAllowed: true,
        redistributionAllowed: true,
        attributionRequired: false,
        enabled: true,
        refreshIntervalMinutes: 60,
        notes: "",
        adapter: badAdapter,
      },
      {
        key: "good",
        name: "Good",
        type: "test",
        baseUrl: "https://good.test",
        licenseStatus: "APPROVED" as const,
        commercialAllowed: true,
        redistributionAllowed: true,
        attributionRequired: false,
        enabled: true,
        refreshIntervalMinutes: 60,
        notes: "",
        adapter: goodAdapter,
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
  goodAdapter = {
    key: "good",
    async fetchPage() {
      return {
        jobs: [
          {
            sourceKey: "good",
            sourceJobId: "g-1",
            externalId: "good:g-1",
            title: "Good Job",
            company: "Good Co",
            location: "Berlin, Germany",
            description: "A sufficiently long description for quality gate.",
            descriptionIsSnippet: false,
            applyUrl: "https://good.test/apply",
            externalUrl: "https://good.test/job",
            remote: false,
            employmentType: "full-time",
            tags: [],
            skills: [],
          },
        ],
        hasMore: false,
        fetched: 1,
        errors: [],
        nextCursor: null,
      };
    },
  };

  badAdapter = {
    key: "bad",
    async fetchPage() {
      throw new Error("simulated_source_failure");
    },
  };
});

describe("source isolation", () => {
  it("runs every source even when one throws", async () => {
    const stats = await runIngestion({ sourceKeys: ["bad", "good"], maxPages: 1 });

    const bad = stats.find((s) => s.sourceKey === "bad");
    const good = stats.find((s) => s.sourceKey === "good");

    // The bad source must be recorded as failed.
    expect(bad).toBeDefined();
    expect(bad!.failed).toBeGreaterThan(0);

    // The good source must have run anyway.
    expect(good).toBeDefined();
    // It should have attempted the fetch (fetched >= 0). We don't
    // assert created counts because the mocked DB no-ops on create.
    expect(good!.completeness).not.toBe("FAILED");

    // Order: bad first, then good (registry order).
    expect(stats[0].sourceKey).toBe("bad");
    expect(stats[1].sourceKey).toBe("good");
  });

  it("does not propagate the exception out of runIngestion", async () => {
    await expect(
      runIngestion({ sourceKeys: ["bad", "good"], maxPages: 1 }),
    ).resolves.toBeInstanceOf(Array);
  });

  it("returns one stats entry per requested source", async () => {
    const stats = await runIngestion({ sourceKeys: ["bad", "good"], maxPages: 1 });
    expect(stats.length).toBeGreaterThanOrEqual(2);
    const keys = stats.map((s) => s.sourceKey);
    expect(keys).toContain("bad");
    expect(keys).toContain("good");
  });
});
