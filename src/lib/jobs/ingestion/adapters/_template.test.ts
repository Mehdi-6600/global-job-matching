/**
 * Template adapter tests — DO NOT run against real network.
 *
 * Copy this file to `<sourceKey>.test.ts` and adjust the fixtures.
 * See README.md in this folder.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../http", () => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("../rate-limit", () => ({
  tryAcquireSourceQuota: vi.fn(() => true),
}));

import { fetchWithRetry } from "../http";
import { templateAdapter } from "./_template";
import { testAdapterContract } from "./adapter-contract.test";

const fetchWithRetryMock = vi.mocked(fetchWithRetry);

beforeEach(() => {
  fetchWithRetryMock.mockReset();
});

/* ------------------------------------------------------------------ */
/* Adapter contract                                                   */
/* ------------------------------------------------------------------ */

testAdapterContract(templateAdapter);

/* ------------------------------------------------------------------ */
/* Fixtures                                                           */
/* ------------------------------------------------------------------ */

function templateItem(patch: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    title: "Sample Role",
    company: "Sample Co",
    description: "A sufficiently long description for the quality gate.",
    location: "Berlin, Germany",
    type: "full-time",
    remote: false,
    url: "https://example.test/jobs/job-1",
    tags: ["react"],
    created_at: 1_700_000_000,
    ...patch,
  };
}

/* ------------------------------------------------------------------ */
/* Behaviour tests                                                    */
/* ------------------------------------------------------------------ */

describe("template adapter — behaviour", () => {
  it("maps a well-formed item into a draft", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: JSON.stringify([templateItem()]),
      attempts: 1,
    });

    const result = await templateAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(result.jobs.length).toBe(1);
    const job = result.jobs[0];
    expect(job.sourceKey).toBe("template");
    expect(job.sourceJobId).toBe("job-1");
    expect(job.externalId).toBe("template:job-1");
  });

  it("skips malformed items", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: JSON.stringify([
        templateItem(),
        { id: "", title: "No id", company: "Co" },
        null,
      ]),
      attempts: 1,
    });

    const result = await templateAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(result.jobs.length).toBe(1);
  });

  it("reports malformed_json on a bad body", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "{not-json",
      attempts: 1,
    });

    const result = await templateAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(result.errors).toContain("malformed_json");
    expect(result.jobs.length).toBe(0);
  });

  it("propagates HTTP errors", async () => {
    fetchWithRetryMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      body: "",
      attempts: 3,
      error: "http_500",
    });

    const result = await templateAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(result.errors).toContain("http_500");
    expect(result.jobs.length).toBe(0);
  });
});
