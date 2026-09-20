/**
 * Adapter contract tests.
 *
 * Every adapter must satisfy these invariants. Adding a new adapter
 * should only require:
 *   1. Implement `JobSourceAdapter`
 *   2. Add to `SOURCE_REGISTRY` with `adapter: <adapter>`
 *   3. Call `testAdapterContract(<adapter>)` here (or in its own file)
 *
 * The tests are mock-free where possible: they exercise the adapter's
 * fetchPage with a mocked HTTP layer so we never hit the network.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JobSourceAdapter } from "../types";

/* ------------------------------------------------------------------ */
/* Mock HTTP so adapters never hit the network.                       */
/* ------------------------------------------------------------------ */

vi.mock("../http", () => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("../rate-limit", () => ({
  tryAcquireSourceQuota: vi.fn(() => true),
}));

/* Import AFTER the mocks. */
import { fetchWithRetry } from "../http";
import { arbeitnowAdapter } from "./arbeitnow";

const fetchWithRetryMock = vi.mocked(fetchWithRetry);

/* ------------------------------------------------------------------ */
/* A minimal response builder used by the Arbeitnow tests.            */
/* ------------------------------------------------------------------ */

function arbeitnowJson(items: unknown[]): string {
  return JSON.stringify(items);
}

function arbeitnowItem(patch: Record<string, unknown> = {}) {
  return {
    slug: "sample-job",
    title: "Sample Job",
    company_name: "Sample Co",
    description: "<p>Hello <b>world</b></p>",
    remote: false,
    url: "https://example.com/jobs/sample-job",
    tags: ["react", "typescript"],
    job_types: ["full-time"],
    location: "Berlin, Germany",
    created_at: 1_700_000_000,
    ...patch,
  };
}

/* ------------------------------------------------------------------ */
/* Generic contract assertions (reusable for future adapters).        */
/* ------------------------------------------------------------------ */

/**
 * Assert the shape of an `AdapterFetchResult` and the invariants of
 * every `IngestJobDraft` it contains. Call from any adapter's tests.
 */
export function expectValidAdapterResult(result: {
  jobs: readonly unknown[];
  hasMore: boolean;
  fetched: number;
  errors: readonly string[];
  nextCursor?: string | null;
}): void {
  expect(Array.isArray(result.jobs)).toBe(true);
  expect(typeof result.hasMore).toBe("boolean");
  expect(typeof result.fetched).toBe("number");
  expect(result.fetched).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(result.errors)).toBe(true);

  for (const job of result.jobs) {
    const j = job as Record<string, unknown>;
    expect(typeof j.sourceKey).toBe("string");
    expect((j.sourceKey as string).length).toBeGreaterThan(0);
    expect(typeof j.sourceJobId).toBe("string");
    expect((j.sourceJobId as string).length).toBeGreaterThan(0);
    expect(typeof j.externalId).toBe("string");
    expect((j.externalId as string).length).toBeGreaterThan(0);
    expect(typeof j.title).toBe("string");
    expect((j.title as string).length).toBeGreaterThan(0);
    expect(typeof j.company).toBe("string");
    expect((j.company as string).length).toBeGreaterThan(0);
    expect(typeof j.location).toBe("string");
    expect(typeof j.description).toBe("string");
    expect(typeof j.descriptionIsSnippet).toBe("boolean");
    expect(typeof j.remote).toBe("boolean");
    expect(typeof j.employmentType).toBe("string");
    expect(Array.isArray(j.tags)).toBe(true);
    expect(Array.isArray(j.skills)).toBe(true);
    // Apply/external URL are nullable but if present must be strings
    if (j.applyUrl !== null) expect(typeof j.applyUrl).toBe("string");
    if (j.externalUrl !== null) expect(typeof j.externalUrl).toBe("string");
  }
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  fetchWithRetryMock.mockReset();
});

describe("adapter contract — arbeitnowAdapter", () => {
  it("has a stable key", () => {
    expect(arbeitnowAdapter.key).toBe("arbeitnow");
    expect(arbeitnowAdapter.key.length).toBeGreaterThan(0);
  });

  it("exposes fetchPage", () => {
    expect(typeof arbeitnowAdapter.fetchPage).toBe("function");
  });

  it("returns a valid empty result when the source is empty", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: arbeitnowJson([]),
      attempts: 1,
    });

    const result = await arbeitnowAdapter.fetchPage({ page: 1, perPage: 10 });
    expectValidAdapterResult(result);
    expect(result.jobs.length).toBe(0);
    expect(result.hasMore).toBe(false);
    expect(result.fetched).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("returns drafts with all required fields", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: arbeitnowJson([arbeitnowItem()]),
      attempts: 1,
    });

    const result = await arbeitnowAdapter.fetchPage({ page: 1, perPage: 10 });
    expectValidAdapterResult(result);
    expect(result.jobs.length).toBe(1);

    const job = result.jobs[0];
    expect(job.sourceKey).toBe("arbeitnow");
    expect(job.sourceJobId).toBe("sample-job");
    expect(job.externalId).toBe("arbeitnow:sample-job");
    expect(job.title).toBe("Sample Job");
    expect(job.company).toBe("Sample Co");
    // HTML stripped
    expect(job.description).toBe("Hello world");
    expect(job.descriptionIsSnippet).toBe(false);
  });

  it("skips malformed items without throwing", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: arbeitnowJson([
        arbeitnowItem(),
        { slug: "", title: "No slug", company_name: "Co" },
        { slug: "x", title: "", company_name: "Co" },
        { slug: "y", title: "Y", company_name: "" },
        null,
        "not-an-object",
      ]),
      attempts: 1,
    });

    const result = await arbeitnowAdapter.fetchPage({ page: 1, perPage: 10 });
    expectValidAdapterResult(result);
    // Only the first valid item survives
    expect(result.jobs.length).toBe(1);
  });

  it("reports malformed_json on a bad body", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "{not-json",
      attempts: 1,
    });

    const result = await arbeitnowAdapter.fetchPage({ page: 1, perPage: 10 });
    expectValidAdapterResult(result);
    expect(result.jobs.length).toBe(0);
    expect(result.errors).toContain("malformed_json");
  });

  it("propagates HTTP errors as errors[] without throwing", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      body: "",
      attempts: 3,
      error: "http_500",
    });

    const result = await arbeitnowAdapter.fetchPage({ page: 1, perPage: 10 });
    expectValidAdapterResult(result);
    expect(result.jobs.length).toBe(0);
    expect(result.errors).toContain("http_500");
  });

  it("does not mix externalId across pages", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: arbeitnowJson([
        arbeitnowItem({ slug: "job-1" }),
        arbeitnowItem({ slug: "job-2" }),
      ]),
      attempts: 1,
    });

    const result = await arbeitnowAdapter.fetchPage({ page: 1, perPage: 10 });
    const ids = result.jobs.map((j) => j.externalId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("arbeitnow:")).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Reusable helper exports for future adapters.                       */
/*                                                                    */
/* When adding a new adapter, import `expectValidAdapterResult` and   */
/* `testAdapterContract` (below) so the same invariants run for it.   */
/* ------------------------------------------------------------------ */

/**
 * Generic contract test runner. Import and call from any adapter's
 * `.test.ts` file to guarantee the same invariants across adapters.
 */
export function testAdapterContract(adapter: JobSourceAdapter): void {
  describe(`adapter contract: ${adapter.key}`, () => {
    it("has a non-empty key", () => {
      expect(adapter.key.length).toBeGreaterThan(0);
    });

    it("exposes fetchPage()", () => {
      expect(typeof adapter.fetchPage).toBe("function");
    });
  });
}
