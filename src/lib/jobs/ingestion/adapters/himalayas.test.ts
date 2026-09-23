import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../http", () => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("../rate-limit", () => ({
  tryAcquireSourceQuota: vi.fn(() => true),
}));

import { fetchWithRetry } from "../http";
import { himalayasAdapter } from "./himalayas";

const fetchMock = vi.mocked(fetchWithRetry);

function job(patch: Record<string, unknown> = {}) {
  return {
    title: "Senior Engineer",
    companyName: "Acme",
    guid: "https://himalayas.app/companies/acme/jobs/senior-engineer-987654",
    applicationLink: "https://acme.example/apply/987654",
    description: "<p>Build <b>things</b></p>",
    locationRestrictions: ["Worldwide"],
    pubDate: 1_700_000_000,
    jobType: "Full Time",
    categories: ["Engineering"],
    ...patch,
  };
}

function response(jobs: unknown[], totalCount?: number) {
  return {
    ok: true,
    status: 200,
    body: JSON.stringify({
      jobs,
      offset: 0,
      limit: 100,
      totalCount: totalCount ?? jobs.length,
    }),
    attempts: 1,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("himalayasAdapter contract", () => {
  it("has stable key", () => {
    expect(himalayasAdapter.key).toBe("himalayas");
  });

  it("returns empty result on empty feed", async () => {
    fetchMock.mockResolvedValueOnce(response([]));
    const r = await himalayasAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.fetched).toBe(0);
    expect(r.hasMore).toBe(false);
    expect(r.errors).toEqual([]);
  });

  it("maps a job into an IngestJobDraft", async () => {
    fetchMock.mockResolvedValueOnce(response([job()]));
    const r = await himalayasAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
    const j = r.jobs[0];
    expect(j.sourceKey).toBe("himalayas");
    expect(j.sourceJobId).toBe("senior-engineer-987654");
    expect(j.externalId).toBe("himalayas:senior-engineer-987654");
    expect(j.title).toBe("Senior Engineer");
    expect(j.company).toBe("Acme");
    expect(j.description).toBe("Build things");
    expect(j.descriptionIsSnippet).toBe(false);
    expect(j.remote).toBe(true);
    expect(j.location).toBe("Worldwide");
  });

  it("joins multi-location restrictions", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ locationRestrictions: ["Europe", "United Kingdom"] })]),
    );
    const r = await himalayasAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].location).toBe("Europe, United Kingdom");
  });

  it("defaults to Remote when location array is empty", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ locationRestrictions: [] })]),
    );
    const r = await himalayasAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].location).toBe("Remote");
  });

  it("skips malformed items without throwing", async () => {
    fetchMock.mockResolvedValueOnce(
      response([
        job(),
        { title: "", companyName: "X" },
        { title: "Y", companyName: "" },
        null,
        "not-an-object",
      ]),
    );
    const r = await himalayasAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
  });

  it("reports malformed_json", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "not-json",
      attempts: 1,
    });
    const r = await himalayasAdapter.fetchPage({ page: 1, perPage: 10 });
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
    const r = await himalayasAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.errors).toContain("http_500");
    expect(r.jobs).toEqual([]);
  });

  it("hasMore based on totalCount", async () => {
    fetchMock.mockResolvedValueOnce(response([job()], 500));
    const r = await himalayasAdapter.fetchPage({ page: 1, perPage: 100 });
    expect(r.hasMore).toBe(true);
  });

  it("never returns nextCursor (declared page-mode)", async () => {
    fetchMock.mockResolvedValueOnce(response([job()]));
    const r = await himalayasAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.nextCursor === null || r.nextCursor === undefined).toBe(true);
  });
});
