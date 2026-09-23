import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../http", () => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("../rate-limit", () => ({
  tryAcquireSourceQuota: vi.fn(() => true),
}));

const eligibleBoards = vi.fn();
const recordBoardCheckMock = vi.fn();

vi.mock("../ats-discovery", () => ({
  getEligibleBoards: eligibleBoards,
  recordBoardCheck: recordBoardCheckMock,
}));

import { fetchWithRetry } from "../http";
import { greenhouseAdapter } from "./greenhouse";

const fetchMock = vi.mocked(fetchWithRetry);

function job(patch: Record<string, unknown> = {}) {
  return {
    id: 123456,
    title: "Senior Engineer",
    updated_at: "2024-01-01T12:00:00-05:00",
    location: { name: "Berlin, Germany" },
    absolute_url: "https://boards.greenhouse.io/acme/jobs/123456",
    content: "<p>Build <b>things</b></p>",
    departments: [{ name: "Engineering" }],
    offices: [{ name: "Berlin" }],
    ...patch,
  };
}

function response(jobs: unknown[]) {
  return {
    ok: true,
    status: 200,
    body: JSON.stringify({ jobs }),
    attempts: 1,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  eligibleBoards.mockReset();
  recordBoardCheckMock.mockReset();
  recordBoardCheckMock.mockResolvedValue(undefined);
});

describe("greenhouseAdapter contract", () => {
  it("has stable key", () => {
    expect(greenhouseAdapter.key).toBe("greenhouse");
  });

  it("returns empty when no eligible boards", async () => {
    eligibleBoards.mockResolvedValueOnce([]);
    const r = await greenhouseAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.hasMore).toBe(false);
  });

  it("maps a job with namespaced id", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "greenhouse", boardIdentifier: "acme", companyName: "Acme Inc" },
    ]);
    fetchMock.mockResolvedValueOnce(response([job()]));
    const r = await greenhouseAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
    const j = r.jobs[0];
    expect(j.sourceKey).toBe("greenhouse");
    expect(j.sourceJobId).toBe("acme:123456");
    expect(j.externalId).toBe("greenhouse:acme:123456");
    expect(j.title).toBe("Senior Engineer");
    expect(j.company).toBe("Acme Inc");
    expect(j.description).toBe("Build things");
    expect(j.location).toBe("Berlin, Germany");
  });

  it("records a successful board check", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "greenhouse", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce(response([job()]));
    await greenhouseAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(recordBoardCheckMock).toHaveBeenCalledWith(
      "greenhouse",
      "acme",
      { ok: true },
    );
  });

  it("records board failure on HTTP error", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "greenhouse", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      body: "",
      attempts: 3,
      error: "http_500",
    });
    const r = await greenhouseAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
    expect(r.errors.some((e) => e.includes("http_500"))).toBe(true);
    expect(recordBoardCheckMock).toHaveBeenCalledWith(
      "greenhouse",
      "acme",
      { ok: false, error: "http_500" },
    );
  });

  it("handles multiple boards in one page", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "greenhouse", boardIdentifier: "acme", companyName: "Acme" },
      { provider: "greenhouse", boardIdentifier: "beta", companyName: "Beta" },
    ]);
    fetchMock
      .mockResolvedValueOnce(response([job({ id: 1 })]))
      .mockResolvedValueOnce(response([job({ id: 2 })]));
    const r = await greenhouseAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(2);
    const ids = r.jobs.map((j) => j.sourceJobId).sort();
    expect(ids).toEqual(["acme:1", "beta:2"]);
  });

  it("reports malformed_json per board", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "greenhouse", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "not-json",
      attempts: 1,
    });
    const r = await greenhouseAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.errors.some((e) => e.includes("malformed_json"))).toBe(true);
  });

  it("hasMore based on board slice", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "greenhouse", boardIdentifier: "a", companyName: "A" },
      { provider: "greenhouse", boardIdentifier: "b", companyName: "B" },
    ]);
    fetchMock
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]));
    const r = await greenhouseAdapter.fetchPage({ page: 1, perPage: 1 });
    expect(r.hasMore).toBe(true);
  });
});
