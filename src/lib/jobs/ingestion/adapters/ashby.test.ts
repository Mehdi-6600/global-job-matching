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
import { ashbyAdapter } from "./ashby";

const fetchMock = vi.mocked(fetchWithRetry);

function job(patch: Record<string, unknown> = {}) {
  return {
    id: "uuid-1",
    title: "Senior Engineer",
    location: "Berlin",
    employmentType: "FullTime",
    department: "Engineering",
    team: "Platform",
    isListed: true,
    isRemote: false,
    publishedAt: "2024-01-01T12:00:00.000Z",
    jobUrl: "https://jobs.ashbyhq.com/acme/uuid-1",
    applyUrl: "https://jobs.ashbyhq.com/acme/uuid-1/application",
    descriptionHtml: "<p>Build <b>things</b></p>",
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

describe("ashbyAdapter contract", () => {
  it("has stable key", () => {
    expect(ashbyAdapter.key).toBe("ashby");
  });

  it("returns empty when no eligible boards", async () => {
    eligibleBoards.mockResolvedValueOnce([]);
    const r = await ashbyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
  });

  it("maps a listed job", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "ashby", boardIdentifier: "acme", companyName: "Acme Inc" },
    ]);
    fetchMock.mockResolvedValueOnce(response([job()]));
    const r = await ashbyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
    const j = r.jobs[0];
    expect(j.sourceKey).toBe("ashby");
    expect(j.sourceJobId).toBe("acme:uuid-1");
    expect(j.externalId).toBe("ashby:acme:uuid-1");
    expect(j.company).toBe("Acme Inc");
    expect(j.description).toBe("Build things");
  });

  it("drops unlisted jobs (isListed !== true)", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "ashby", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce(
      response([
        job({ id: "listed", isListed: true }),
        job({ id: "unlisted", isListed: false }),
        job({ id: "missing" }), // isListed undefined
      ]),
    );
    const r = await ashbyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
    expect(r.jobs[0].sourceJobId).toBe("acme:listed");
  });

  it("infers remote from isRemote or location", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "ashby", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce(
      response([
        job({ id: "a", isRemote: true, location: "Berlin" }),
        job({ id: "b", isRemote: false, location: "Remote - Europe" }),
        job({ id: "c", isRemote: false, location: "Berlin" }),
      ]),
    );
    const r = await ashbyAdapter.fetchPage({ page: 1, perPage: 10 });
    const byId = new Map(r.jobs.map((j) => [j.sourceJobId, j.remote]));
    expect(byId.get("acme:a")).toBe(true);
    expect(byId.get("acme:b")).toBe(true);
    expect(byId.get("acme:c")).toBe(false);
  });

  it("records successful board check", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "ashby", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce(response([job()]));
    await ashbyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(recordBoardCheckMock).toHaveBeenCalledWith(
      "ashby",
      "acme",
      { ok: true },
    );
  });

  it("records board failure on HTTP error", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "ashby", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      body: "",
      attempts: 3,
      error: "http_500",
    });
    const r = await ashbyAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.errors.some((e) => e.includes("http_500"))).toBe(true);
  });
});
