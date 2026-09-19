import { describe, expect, it } from "vitest";
import { evaluateCircuit, CIRCUIT_DEFAULTS } from "@/lib/jobs/ingestion/circuit-breaker";
import { contentFingerprint } from "@/lib/jobs/ingestion/content-fingerprint";
import { parseCheckpoint } from "@/lib/jobs/ingestion/checkpoint";

describe("circuit breaker", () => {
  it("CLOSED when under threshold", () => {
    const r = evaluateCircuit({
      enabled: true,
      consecutiveFailures: 0,
      lastErrorAt: null,
    });
    expect(r.state).toBe("CLOSED");
    expect(r.allowRequest).toBe(true);
  });

  it("OPEN during cooldown", () => {
    const r = evaluateCircuit({
      enabled: true,
      consecutiveFailures: CIRCUIT_DEFAULTS.openAt,
      lastErrorAt: new Date(),
      now: new Date(),
    });
    expect(r.state).toBe("OPEN");
    expect(r.allowRequest).toBe(false);
  });

  it("HALF_OPEN after cooldown", () => {
    const last = new Date(Date.now() - CIRCUIT_DEFAULTS.cooldownMs - 1000);
    const r = evaluateCircuit({
      enabled: true,
      consecutiveFailures: CIRCUIT_DEFAULTS.openAt,
      lastErrorAt: last,
      now: new Date(),
    });
    expect(r.state).toBe("HALF_OPEN");
    expect(r.allowRequest).toBe(true);
  });
});

describe("content fingerprint", () => {
  it("stable for same content, changes on title", () => {
    const a = contentFingerprint({
      title: "A",
      description: "d",
      location: "Berlin",
      applyUrl: "https://x.com/1",
      externalUrl: null,
      employmentType: "full-time",
      remote: false,
      salaryText: null,
      company: "Co",
    });
    const b = contentFingerprint({
      title: "A",
      description: "d",
      location: "Berlin",
      applyUrl: "https://x.com/1",
      externalUrl: null,
      employmentType: "full-time",
      remote: false,
      salaryText: null,
      company: "Co",
    });
    const c = contentFingerprint({
      title: "B",
      description: "d",
      location: "Berlin",
      applyUrl: "https://x.com/1",
      externalUrl: null,
      employmentType: "full-time",
      remote: false,
      salaryText: null,
      company: "Co",
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("checkpoint v1", () => {
  it("parses page and cursor", () => {
    const cp = parseCheckpoint(
      JSON.stringify({ v: 1, page: 4, cursor: "tok", updatedAt: "2026-01-01T00:00:00.000Z" }),
    );
    expect(cp?.page).toBe(4);
    expect(cp?.cursor).toBe("tok");
  });
});
