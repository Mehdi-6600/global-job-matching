import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../http", () => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("../rate-limit", () => ({
  tryAcquireSourceQuota: vi.fn(() => true),
}));

import { fetchWithRetry } from "../http";
import { jobicyAdapter } from "./jobicy";

const fetchMock = vi.mocked(fetchWithRetry);

function job(patch: Record<string, unknown> = {}) {
  return {
    id: 123456,
    url: "https://jobicy.com/jobs/123456-senior-engineer",
    jobSlug: "senior-engineer",
    jobTitle: "Senior Engineer",
    companyName: "Acme",
    jobIndustry: ["Engineering"],
    jobType: ["full-time"],
    jobGeo: "Anywhere",
    jobDescription: "<p>Build <b>things</b></p>",
    pubDate: "2024-01-01 12:00:00",
    ...patch,
  };
}

function response(jobs: unknown[]) {
  return {
    ok: true,
    status: 200,
    body: JSON.stringify({ jobCount: jobs.length, jobs }),
    attempts: 1,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("jobicyAdapter contract", () => {
  it("has stable key", () => {
    expect(jobicyAdapter.key).toBe("jobicy");
  });

  it("returns empty on empty feed", async () => {
    fetchMock.mockResolvedValueOnce(response([]));
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.fetched).toBe(0);
    expect(r.hasMore).toBe(false);
    expect(r.errors).toEqual([]);
  });

  it("maps a job", async () => {
    fetchMock.mockResolvedValueOnce(response([job()]));
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
    const j = r.jobs[0];
    expect(j.sourceKey).toBe("jobicy");
    expect(j.sourceJobId).toBe("123456");
    expect(j.externalId).toBe("jobicy:123456");
    expect(j.title).toBe("Senior Engineer");
    expect(j.company).toBe("Acme");
    expect(j.description).toBe("Build things");
    expect(j.descriptionIsSnippet).toBe(false);
    expect(j.remote).toBe(true);
    expect(j.employmentType).toBe("full-time");
    expect(j.location).toBe("Anywhere");
  });

  it("parses 'YYYY-MM-DD HH:MM:SS' as UTC", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ pubDate: "2024-06-15 08:30:00" })]),
    );
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    const d = r.jobs[0].publishedAt;
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2024-06-15T08:30:00.000Z");
  });

  it("accepts ISO pubDate too", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ pubDate: "2024-06-15T08:30:00.000Z" })]),
    );
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    const d = r.jobs[0].publishedAt;
    expect(d?.toISOString()).toBe("2024-06-15T08:30:00.000Z");
  });

  it("returns null publishedAt on malformed date", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ pubDate: "not-a-date" })]),
    );
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].publishedAt).toBeNull();
  });

  it("skips malformed items", async () => {
    fetchMock.mockResolvedValueOnce(
      response([
        job(),
        { jobTitle: "" },
        { jobTitle: "X", companyName: "" },
        null,
        "not-an-object",
      ]),
    );
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
  });

  it("falls back to jobSlug when id is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ id: undefined, jobSlug: "fallback-slug" })]),
    );
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].sourceJobId).toBe("fallback-slug");
    expect(r.jobs[0].externalId).toBe("jobicy:fallback-slug");
  });

  it("reports malformed_json", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "oops",
      attempts: 1,
    });
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.errors).toContain("malformed_json");
  });

  it("propagates HTTP errors", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      body: "",
      attempts: 3,
      error: "http_500",
    });
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.errors).toContain("http_500");
  });

  it("returns no jobs on page > 1 (single-shot source)", async () => {
    const r = await jobicyAdapter.fetchPage({ page: 2, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.hasMore).toBe(false);
    expect(r.fetched).toBe(0);
    expect(r.errors).toEqual([]);
  });

  it("never returns nextCursor (declared single-mode)", async () => {
    fetchMock.mockResolvedValueOnce(response([job()]));
    const r = await jobicyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.nextCursor === null || r.nextCursor === undefined).toBe(true);
  });
});
