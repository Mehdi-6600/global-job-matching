import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../http", () => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("../rate-limit", () => ({
  tryAcquireSourceQuota: vi.fn(() => true),
}));

import { fetchWithRetry } from "../http";
import { remoteokAdapter } from "./remoteok";

const fetchMock = vi.mocked(fetchWithRetry);

function job(patch: Record<string, unknown> = {}) {
  return {
    id: "123456",
    slug: "remote-senior-engineer-123456",
    epoch: 1_700_000_000,
    date: "2024-01-01T12:00:00+00:00",
    company: "Acme",
    position: "Senior Engineer",
    tags: ["react", "typescript"],
    description: "<p>Build <b>things</b></p>",
    location: "Worldwide",
    salary_min: 0,
    salary_max: 0,
    apply_url: "https://remoteok.com/remote-jobs/123456",
    url: "https://remoteok.com/remote-jobs/123456",
    ...patch,
  };
}

function metadata() {
  return {
    legal: "This feed is for personal use only.",
    last_updated: 1_700_000_000,
  };
}

function response(items: unknown[]) {
  return {
    ok: true,
    status: 200,
    body: JSON.stringify(items),
    attempts: 1,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("remoteokAdapter contract", () => {
  it("has stable key", () => {
    expect(remoteokAdapter.key).toBe("remoteok");
  });

  it("returns empty on empty array", async () => {
    fetchMock.mockResolvedValueOnce(response([]));
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.fetched).toBe(0);
    expect(r.hasMore).toBe(false);
    expect(r.errors).toEqual([]);
  });

  it("skips the metadata header element", async () => {
    fetchMock.mockResolvedValueOnce(response([metadata(), job()]));
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
    // fetched counts raw array length, including the metadata row
    expect(r.fetched).toBe(2);
  });

  it("maps a job", async () => {
    fetchMock.mockResolvedValueOnce(response([metadata(), job()]));
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    const j = r.jobs[0];
    expect(j.sourceKey).toBe("remoteok");
    expect(j.sourceJobId).toBe("123456");
    expect(j.externalId).toBe("remoteok:123456");
    expect(j.title).toBe("Senior Engineer");
    expect(j.company).toBe("Acme");
    expect(j.description).toBe("Build things");
    expect(j.descriptionIsSnippet).toBe(false);
    expect(j.remote).toBe(true);
    expect(j.location).toBe("Worldwide");
    expect(j.employmentType).toBe("full-time");
  });

  it("uses numeric id even if string is present", async () => {
    fetchMock.mockResolvedValueOnce(response([job({ id: 999999 })]));
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].sourceJobId).toBe("999999");
  });

  it("falls back to slug when id is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ id: undefined, slug: "fallback-slug" })]),
    );
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].sourceJobId).toBe("fallback-slug");
  });

  it("defaults location to Remote when missing", async () => {
    fetchMock.mockResolvedValueOnce(response([job({ location: "" })]));
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].location).toBe("Remote");
  });

  it("parses ISO date", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ date: "2024-06-15T08:30:00.000Z" })]),
    );
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].publishedAt?.toISOString()).toBe(
      "2024-06-15T08:30:00.000Z",
    );
  });

  it("falls back to epoch when date is invalid", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ date: "not-a-date", epoch: 1_700_000_000 })]),
    );
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    const d = r.jobs[0].publishedAt;
    expect(d).toBeInstanceOf(Date);
    expect(d?.getTime()).toBe(1_700_000_000_000);
  });

  it("only includes salary when positive", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ salary_min: 80_000, salary_max: 120_000 })]),
    );
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].salaryMin).toBe(80_000);
    expect(r.jobs[0].salaryMax).toBe(120_000);
  });

  it("null salary when zero or missing", async () => {
    fetchMock.mockResolvedValueOnce(
      response([job({ salary_min: 0, salary_max: 0 })]),
    );
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].salaryMin).toBeNull();
    expect(r.jobs[0].salaryMax).toBeNull();
  });

  it("skips malformed items without throwing", async () => {
    fetchMock.mockResolvedValueOnce(
      response([
        job(),
        { position: "", company: "X" },
        { position: "Y", company: "" },
        null,
        "not-an-object",
      ]),
    );
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
  });

  it("reports malformed_json", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "oops",
      attempts: 1,
    });
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
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
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.errors).toContain("http_500");
  });

  it("returns no jobs on page > 1 (single-shot source)", async () => {
    const r = await remoteokAdapter.fetchPage({ page: 2, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.hasMore).toBe(false);
    expect(r.fetched).toBe(0);
    expect(r.errors).toEqual([]);
  });

  it("never returns nextCursor (declared single-mode)", async () => {
    fetchMock.mockResolvedValueOnce(response([job()]));
    const r = await remoteokAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.nextCursor === null || r.nextCursor === undefined).toBe(true);
  });
});
