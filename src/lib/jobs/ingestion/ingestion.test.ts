/**
 * Ingestion unit tests — pure logic, no DB.
 * Covers identity, dedup, quality, health, freshness gates, checkpoint, rate-limit, license.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { assessJobQuality } from "@/lib/jobs/ingestion/quality";
import { scoreDedup } from "@/lib/jobs/ingestion/dedup";
import { inferOccupation } from "@/lib/jobs/ingestion/occupation";
import {
  isProductionIngestAllowed,
  SOURCE_REGISTRY,
  getEnabledSources,
} from "@/lib/jobs/ingestion/registry";
import {
  makeNamespacedExternalId,
  parseNamespacedExternalId,
} from "@/lib/jobs/ingestion/identity";
import {
  computeHealthStatus,
  HEALTH_THRESHOLDS,
} from "@/lib/jobs/ingestion/health";
import {
  computeFreshnessStatus,
  mayApplyAbsenceFreshness,
} from "@/lib/jobs/ingestion/freshness";
import { parseCheckpoint } from "@/lib/jobs/ingestion/checkpoint";
import {
  tryAcquireSourceQuota,
  _resetRateLimitBuckets,
} from "@/lib/jobs/ingestion/rate-limit";
import { normalizeJobUrl, isValidHttpUrl } from "@/lib/jobs/ingestion/url";
import type { IngestJobDraft } from "@/lib/jobs/ingestion/types";

function draft(partial: Partial<IngestJobDraft> = {}): IngestJobDraft {
  return {
    sourceKey: "arbeitnow",
    sourceJobId: "abc",
    externalId: "arbeitnow:abc",
    title: "Warehouse Worker",
    company: "Logistics Co",
    location: "Berlin, Germany",
    description:
      "Move goods, operate scanner, follow safety rules every day on site.",
    descriptionIsSnippet: false,
    applyUrl: "https://example.com/jobs/1",
    externalUrl: "https://example.com/jobs/1",
    remote: false,
    employmentType: "full-time",
    tags: ["warehouse"],
    skills: ["scanner"],
    ...partial,
  };
}

function ref(
  partial: Parameters<typeof scoreDedup>[1] extends infer R ? Partial<R> : never,
) {
  return {
    id: "j1",
    externalId: null as string | null,
    externalUrl: null as string | null,
    applyUrl: null as string | null,
    title: "Warehouse Worker",
    location: "Berlin, Germany",
    postedById: null as string | null,
    companyName: "Logistics Co",
    ...partial,
  };
}

/* -------------------------------------------------------------------------- */
describe("identity namespace", () => {
  it("namespaces raw sourceJobId", () => {
    expect(makeNamespacedExternalId("greenhouse", "12345")).toBe(
      "greenhouse:12345",
    );
  });

  it("does not double-prefix same source", () => {
    expect(makeNamespacedExternalId("arbeitnow", "arbeitnow:slug")).toBe(
      "arbeitnow:slug",
    );
  });

  it("different sources with same raw id stay distinct", () => {
    const a = makeNamespacedExternalId("greenhouse", "12345");
    const b = makeNamespacedExternalId("lever", "12345");
    expect(a).not.toBe(b);
    expect(a).toBe("greenhouse:12345");
    expect(b).toBe("lever:12345");
  });

  it("parses namespaced externalId", () => {
    expect(parseNamespacedExternalId("arbeitnow:abc")).toEqual({
      sourceKey: "arbeitnow",
      sourceJobId: "abc",
    });
  });
});

/* -------------------------------------------------------------------------- */
describe("ingestion quality", () => {
  it("rejects empty title/company", () => {
    const q = assessJobQuality(draft({ title: "ab", company: "x" }));
    expect(q.ok).toBe(false);
  });

  it("accepts complete non-tech job", () => {
    const q = assessJobQuality(draft());
    expect(q.ok).toBe(true);
    expect(q.score).toBeGreaterThan(0.5);
  });

  it("rejects invalid apply URL", () => {
    const q = assessJobQuality(draft({ applyUrl: "not-a-url" }));
    expect(q.ok).toBe(false);
  });

  it("preserves description when valid", () => {
    const d = draft();
    const q = assessJobQuality(d);
    expect(q.ok).toBe(true);
    expect(d.description.length).toBeGreaterThan(20);
  });
});

/* -------------------------------------------------------------------------- */
describe("ingestion dedup", () => {
  it("matches same externalId at level 1", () => {
    const m = scoreDedup(
      draft(),
      ref({ externalId: "arbeitnow:abc", title: "Other", location: "Munich" }),
    );
    expect(m?.level).toBe(1);
    expect(m?.confidence).toBeGreaterThanOrEqual(0.98);
  });

  it("different source same raw id does not match on externalId", () => {
    const m = scoreDedup(
      draft({
        sourceKey: "greenhouse",
        sourceJobId: "123",
        externalId: "greenhouse:123",
      }),
      ref({ externalId: "lever:123" }),
    );
    // external ids differ → not L1; company/title/location may still match L4
    expect(m?.level === 1).toBe(false);
  });

  it("matches same external URL at level 2", () => {
    const url = "https://boards.example.com/jobs/99";
    const m = scoreDedup(
      draft({ externalUrl: url, externalId: "arbeitnow:x" }),
      ref({ externalId: "other:y", externalUrl: url }),
    );
    expect(m?.level).toBe(2);
  });

  it("matches same apply URL at level 3", () => {
    const url = "https://apply.example.com/a/1";
    const m = scoreDedup(
      draft({ applyUrl: url, externalId: "arbeitnow:x", externalUrl: null }),
      ref({ externalId: "other:y", applyUrl: url }),
    );
    expect(m?.level).toBe(3);
  });

  it("never matches employer-owned jobs", () => {
    const m = scoreDedup(
      draft(),
      ref({
        externalId: "arbeitnow:abc",
        postedById: "user_employer_1",
      }),
    );
    expect(m).toBeNull();
  });

  it("does not merge same title different location", () => {
    const m = scoreDedup(
      draft(),
      ref({
        externalId: "arbeitnow:other",
        location: "Munich, Germany",
      }),
    );
    expect(m).toBeNull();
  });

  it("matches company+title+same location (L4)", () => {
    const m = scoreDedup(
      draft(),
      ref({ externalId: "other:1" }),
    );
    expect(m?.level).toBe(4);
  });

  it("same company different jobs (different title) do not match", () => {
    const m = scoreDedup(
      draft({ title: "Forklift Operator" }),
      ref({ externalId: "other:2", title: "Warehouse Worker" }),
    );
    expect(m).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
describe("occupation intelligence", () => {
  it("classifies non-tech and tech titles", () => {
    expect(inferOccupation("Registered Nurse").occupationFamily).toBe(
      "healthcare",
    );
    expect(inferOccupation("Electrician").occupationFamily).toBe("trades");
    expect(inferOccupation("Senior Software Engineer").occupation).toBe(
      "software_engineer",
    );
    expect(inferOccupation("Cashier").occupation).toBe("cashier");
  });
});

/* -------------------------------------------------------------------------- */
describe("source license gate", () => {
  it("blocks UNKNOWN and NEEDS_PERMISSION from production ingest", () => {
    for (const s of SOURCE_REGISTRY) {
      if (s.licenseStatus !== "APPROVED" || !s.redistributionAllowed) {
        expect(isProductionIngestAllowed(s)).toBe(false);
      }
    }
  });

  it("only enables approved redistribution sources", () => {
    const keys = getEnabledSources().map((s) => s.key);
    expect(keys).toContain("arbeitnow");
    expect(keys).not.toContain("remoteok");
    expect(keys).not.toContain("jooble");
    expect(keys).not.toContain("adzuna");
    expect(keys).not.toContain("greenhouse");
  });

  it("unknown license never allowed", () => {
    expect(
      isProductionIngestAllowed({
        enabled: true,
        licenseStatus: "UNKNOWN",
      }),
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
describe("health state machine", () => {
  it("0 failures → HEALTHY", () => {
    expect(
      computeHealthStatus({
        enabled: true,
        consecutiveFailures: 0,
        fetched: 10,
        failed: 0,
        timedOut: false,
      }),
    ).toBe("HEALTHY");
  });

  it("1 failure → DEGRADED", () => {
    expect(
      computeHealthStatus({
        enabled: true,
        consecutiveFailures: HEALTH_THRESHOLDS.degradedAt,
        fetched: 0,
        failed: 1,
        timedOut: false,
      }),
    ).toBe("DEGRADED");
  });

  it("3+ failures → FAILING", () => {
    expect(
      computeHealthStatus({
        enabled: true,
        consecutiveFailures: HEALTH_THRESHOLDS.failingAt,
        fetched: 0,
        failed: 3,
        timedOut: false,
      }),
    ).toBe("FAILING");
  });

  it("disabled source → DISABLED (not auto from failures alone)", () => {
    expect(
      computeHealthStatus({
        enabled: false,
        consecutiveFailures: 0,
        fetched: 0,
        failed: 0,
        timedOut: false,
      }),
    ).toBe("DISABLED");
  });

  it("timeout alone → DEGRADED", () => {
    expect(
      computeHealthStatus({
        enabled: true,
        consecutiveFailures: 0,
        fetched: 5,
        failed: 0,
        timedOut: true,
      }),
    ).toBe("DEGRADED");
  });
});

/* -------------------------------------------------------------------------- */
describe("freshness / FULL vs PARTIAL", () => {
  it("only FULL may apply absence freshness", () => {
    expect(mayApplyAbsenceFreshness("FULL")).toBe(true);
    expect(mayApplyAbsenceFreshness("PARTIAL")).toBe(false);
    expect(mayApplyAbsenceFreshness("FAILED")).toBe(false);
  });

  it("computes aging from lastSeenAt", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 60_000);
    expect(computeFreshnessStatus(recent, now)).toMatch(/fresh/i);

    const old = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    const status = String(computeFreshnessStatus(old, now)).toLowerCase();
    expect(["stale", "expired", "archived", "aging"]).toContain(status);
  });
});

/* -------------------------------------------------------------------------- */
describe("checkpoint parse", () => {
  it("parses valid cursor", () => {
    const cp = parseCheckpoint(
      JSON.stringify({ page: 3, updatedAt: "2026-01-01T00:00:00.000Z" }),
    );
    expect(cp?.page).toBe(3);
  });

  it("rejects invalid cursor", () => {
    expect(parseCheckpoint(null)).toBeNull();
    expect(parseCheckpoint("not-json")).toBeNull();
    expect(parseCheckpoint(JSON.stringify({ page: 0 }))).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
describe("rate limit per source", () => {
  beforeEach(() => {
    _resetRateLimitBuckets();
  });

  it("allows under limit and blocks over limit independently per source", () => {
    expect(tryAcquireSourceQuota("a", 2)).toBe(true);
    expect(tryAcquireSourceQuota("a", 2)).toBe(true);
    expect(tryAcquireSourceQuota("a", 2)).toBe(false);
    // source B unaffected
    expect(tryAcquireSourceQuota("b", 2)).toBe(true);
  });

  it("unlimited when limit null or 0", () => {
    expect(tryAcquireSourceQuota("x", null)).toBe(true);
    expect(tryAcquireSourceQuota("x", 0)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
describe("URL normalize", () => {
  it("validates http(s) only", () => {
    expect(isValidHttpUrl("https://example.com/a")).toBe(true);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl(null)).toBe(false);
  });

  it("strips safe tracking params", () => {
    const n = normalizeJobUrl(
      "https://Example.com/jobs/1/?utm_source=x&id=9",
    );
    expect(n).toContain("id=9");
    expect(n).not.toContain("utm_source");
    expect(n?.startsWith("https://example.com")).toBe(true);
  });
});
