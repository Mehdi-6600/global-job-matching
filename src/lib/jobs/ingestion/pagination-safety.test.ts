/**
 * Pagination loop protection tests.
 *
 * The pipeline must reject a repeated nextCursor instead of burning
 * the budget on identical pages. The adapter is mocked so we can feed
 * exact cursor sequences.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JobSourceAdapter, AdapterFetchResult } from "./types";

/* ------------------------------------------------------------------ */
/* Mock all dependencies that would hit the database or network.      */
/* ------------------------------------------------------------------ */

vi.mock("@/lib/db", () => ({
  db: {
    jobSource: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 0 })),
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
/* Build a fake registry containing exactly one adapter.              */
/* ------------------------------------------------------------------ */

let fakeAdapter: JobSourceAdapter;

vi.mock("./registry", async () => {
  const actual = await vi.importActual<typeof import("./registry")>(
    "./registry",
  );
  return {
    ...actual,
    // Return our fake adapter for the "fake" source.
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
        capabilities: { pagination: "cursor" },
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

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function emptyResult(patch: Partial<AdapterFetchResult>): AdapterFetchResult {
  return {
    jobs: [],
    hasMore: false,
    fetched: 0,
    errors: [],
    nextCursor: null,
    ...patch,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe("pagination loop protection", () => {
  it("stops immediately when nextCursor repeats", async () => {
    let call = 0;
    fakeAdapter = {
      key: "fake",
      async fetchPage() {
        call += 1;
        if (call === 1) {
          return emptyResult({ nextCursor: "A", hasMore: true, fetched: 1 });
        }
        if (call === 2) {
          return emptyResult({ nextCursor: "B", hasMore: true, fetched: 1 });
        }
        // Loop: B again
        return emptyResult({ nextCursor: "B", hasMore: true, fetched: 1 });
      },
    };

    const stats = await runIngestion({ sourceKeys: ["fake"], maxPages: 5 });
    const s = stats.find((x) => x.sourceKey === "fake");
    expect(s).toBeDefined();
    expect(s!.errors).toContain("pagination_loop_detected");
    // We should have stopped after the loop was detected, not run all 5 pages.
    expect(call).toBeLessThanOrEqual(4);
  });

  it("never starts a new page after hasMore=false", async () => {
    let call = 0;
    fakeAdapter = {
      key: "fake",
      async fetchPage() {
        call += 1;
        return emptyResult({
          nextCursor: null,
          hasMore: false,
          fetched: 0,
        });
      },
    };

    await runIngestion({ sourceKeys: ["fake"], maxPages: 5 });
    // Single page → single fetch
    expect(call).toBe(1);
  });

  it("does not treat null nextCursor as a loop", async () => {
    let call = 0;
    fakeAdapter = {
      key: "fake",
      async fetchPage() {
        call += 1;
        return emptyResult({
          nextCursor: null,
          hasMore: call < 2,
          fetched: 0,
        });
      },
    };

    const stats = await runIngestion({ sourceKeys: ["fake"], maxPages: 5 });
    const s = stats.find((x) => x.sourceKey === "fake");
    // Should not contain the loop error
    expect(s!.errors).not.toContain("pagination_loop_detected");
  });

  it("does not treat undefined nextCursor as a loop (adapter has no cursor)", async () => {
    let call = 0;
    fakeAdapter = {
      key: "fake",
      async fetchPage() {
        call += 1;
        // Adapter does not return nextCursor at all; still has more.
        const r = emptyResult({ hasMore: call < 2, fetched: 0 });
        // Delete nextCursor to simulate undefined
        const { nextCursor: _ignored, ...rest } = r;
        void _ignored;
        return rest as AdapterFetchResult;
      },
    };

    const stats = await runIngestion({ sourceKeys: ["fake"], maxPages: 5 });
    const s = stats.find((x) => x.sourceKey === "fake");
    expect(s!.errors).not.toContain("pagination_loop_detected");
  });

  it("respects maxPages cap even when adapter keeps returning new cursors", async () => {
    let call = 0;
    fakeAdapter = {
      key: "fake",
      async fetchPage() {
        call += 1;
        return emptyResult({
          nextCursor: `cursor-${call}`,
          hasMore: true,
          fetched: 1,
        });
      },
    };

    await runIngestion({ sourceKeys: ["fake"], maxPages: 3 });
    // maxPages = 3 → at most 3 fetch calls
    expect(call).toBeLessThanOrEqual(3);
  });
});
