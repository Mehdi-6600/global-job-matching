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
import { leverAdapter } from "./lever";

const fetchMock = vi.mocked(fetchWithRetry);

function posting(patch: Record<string, unknown> = {}) {
  return {
    id: "abc-123",
    text: "Senior Engineer",
    hostedUrl: "https://jobs.lever.co/acme/abc-123",
    applyUrl: "https://jobs.lever.co/acme/abc-123/apply",
    createdAt: 1_700_000_000_000,
    categories: {
      location: "Berlin",
      team: "Engineering",
      commitment: "Full-time",
    },
    description: "<p>Build <b>things</b></p>",
    ...patch,
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
  eligibleBoards.mockReset();
  recordBoardCheckMock.mockReset();
  recordBoardCheckMock.mockResolvedValue(undefined);
});

describe("leverAdapter contract", () => {
  it("has stable key", () => {
    expect(leverAdapter.key).toBe("lever");
  });

  it("returns empty when no eligible boards", async () => {
    eligibleBoards.mockResolvedValueOnce([]);
    const r = await leverAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toEqual([]);
  });

  it("maps a posting with namespaced id", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "lever", boardIdentifier: "acme", companyName: "Acme Inc" },
    ]);
    fetchMock.mockResolvedValueOnce(response([posting()]));
    const r = await leverAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs).toHaveLength(1);
    const j = r.jobs[0];
    expect(j.sourceKey).toBe("lever");
    expect(j.sourceJobId).toBe("acme:abc-123");
    expect(j.externalId).toBe("lever:acme:abc-123");
    expect(j.company).toBe("Acme Inc");
    expect(j.description).toBe("Build things");
    expect(j.employmentType).toBe("Full-time");
    expect(j.location).toBe("Berlin");
  });

  it("prefers descriptionPlain when present", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "lever", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce(
      response([posting({ descriptionPlain: "Plain text body" })]),
    );
    const r = await leverAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.jobs[0].description).toBe("Plain text body");
  });

  it("records successful board check", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "lever", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce(response([posting()]));
    await leverAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(recordBoardCheckMock).toHaveBeenCalledWith(
      "lever",
      "acme",
      { ok: true },
    );
  });

  it("records board failure on HTTP error", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "lever", boardIdentifier: "acme", companyName: "Acme" },
    ]);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      body: "",
      attempts: 3,
      error: "http_500",
    });
    const r = await leverAdapter.fetchPage({ page: 1, perPage: 10 });
    expect(r.errors.some((e) => e.includes("http_500"))).toBe(true);
  });

  it("multiple boards produce namespaced jobs", async () => {
    eligibleBoards.mockResolvedValueOnce([
      { provider: "lever", boardIdentifier: "acme", companyName: "Acme" },
      { provider: "lever", boardIdentifier: "beta", companyName: "Beta" },
    ]);
    fetchMock
      .mockResolvedValueOnce(response([posting({ id: "x" })]))
      .mockResolvedValueOnce(response([posting({ id: "y" })]));
    const r = await leverAdapter.fetchPage({ page: 1, perPage: 10 });
    const ids = r.jobs.map((j) => j.sourceJobId).sort();
    expect(ids).toEqual(["acme:x", "beta:y"]);
  });
});
