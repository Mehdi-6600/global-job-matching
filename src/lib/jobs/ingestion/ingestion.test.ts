/**
 * Business unit tests + DB-layer integration tests (in-memory Prisma mock).
 * Run: npm test
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IngestJobDraft } from "@/lib/jobs/ingestion/types";

/* -------------------------------------------------------------------------- */
/*  In-memory DB mock (integration)                                           */
/* -------------------------------------------------------------------------- */

type JobRow = {
  id: string;
  externalId: string | null;
  source: string | null;
  status: string;
  postedById: string | null;
  lastSeenAt: Date | null;
  freshnessStatus: string | null;
  title: string;
  location: string;
};

type SourceRow = {
  key: string;
  enabled: boolean;
  consecutiveFailures: number;
  jobsFetched: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsSkipped: number;
  healthStatus: string;
  lastError: string | null;
  lastErrorAt: Date | null;
  lastSuccessAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  syncCursor: string | null;
};

const jobStore = new Map<string, JobRow>();
const sourceStore = new Map<string, SourceRow>();
const listingStore = new Map<string, { jobId: string; sourceKey: string; sourceJobId: string }>();

function listingKey(sourceKey: string, sourceJobId: string) {
  return `${sourceKey}::${sourceJobId}`;
}

vi.mock("@/lib/db", () => ({
  db: {
    job: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const rows = [...jobStore.values()];
        if (where.postedById === null) {
          const id = where.id as string | undefined;
          const externalId = where.externalId as string | undefined;
          const externalUrl = where.externalUrl as string | undefined;
          const applyUrl = where.applyUrl as string | undefined;
          const hit = rows.find((j) => {
            if (j.postedById !== null) return false;
            if (id && j.id !== id) return false;
            if (externalId && j.externalId !== externalId) return false;
            if (externalUrl && (j as { externalUrl?: string }).externalUrl !== externalUrl)
              return false;
            if (applyUrl && (j as { applyUrl?: string }).applyUrl !== applyUrl) return false;
            return Boolean(id || externalId || externalUrl || applyUrl);
          });
          return hit
            ? {
                ...hit,
                externalUrl: (hit as { externalUrl?: string }).externalUrl ?? null,
                applyUrl: (hit as { applyUrl?: string }).applyUrl ?? null,
                company: { name: "Logistics Co" },
              }
            : null;
        }
        return null;
      }),
      findMany: vi.fn(
        async ({
          where,
          take,
          cursor,
          orderBy,
        }: {
          where: {
            postedById: null;
            source: string;
            status: string;
          };
          take?: number;
          cursor?: { id: string };
          orderBy?: { id: string };
          skip?: number;
        }) => {
          let rows = [...jobStore.values()]
            .filter(
              (j) =>
                j.postedById === null &&
                j.source === where.source &&
                j.status === where.status,
            )
            .sort((a, b) => a.id.localeCompare(b.id));
          if (cursor?.id) {
            const idx = rows.findIndex((r) => r.id === cursor.id);
            rows = idx >= 0 ? rows.slice(idx + 1) : rows;
          }
          return rows.slice(0, take ?? 500);
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string; postedById: null };
          data: Partial<JobRow>;
        }) => {
          const j = jobStore.get(where.id);
          if (!j || j.postedById !== null) return { count: 0 };
          Object.assign(j, data);
          return { count: 1 };
        },
      ),
      create: vi.fn(async ({ data }: { data: Partial<JobRow> & { id?: string } }) => {
        const id = data.id ?? `job_${jobStore.size + 1}`;
        const row: JobRow = {
          id,
          externalId: data.externalId ?? null,
          source: data.source ?? null,
          status: data.status ?? "active",
          postedById: data.postedById ?? null,
          lastSeenAt: data.lastSeenAt ?? new Date(),
          freshnessStatus: data.freshnessStatus ?? "fresh",
          title: data.title ?? "",
          location: data.location ?? "",
        };
        jobStore.set(id, row);
        return row;
      }),
    },
    jobSource: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        return sourceStore.get(where.key) ?? null;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { key: string };
          data: Record<string, unknown>;
        }) => {
          const row = sourceStore.get(where.key);
          if (!row) throw new Error("source_missing");
          for (const [k, v] of Object.entries(data)) {
            if (v && typeof v === "object" && "increment" in (v as object)) {
              const n = (v as { increment: number }).increment;
              (row as Record<string, number>)[k] =
                ((row as Record<string, number>)[k] ?? 0) + n;
            } else {
              (row as Record<string, unknown>)[k] = v;
            }
          }
          return row;
        },
      ),
    },
    jobSourceListing: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { sourceKey_sourceJobId: { sourceKey: string; sourceJobId: string } };
        }) => {
          const k = listingKey(
            where.sourceKey_sourceJobId.sourceKey,
            where.sourceKey_sourceJobId.sourceJobId,
          );
          return listingStore.get(k) ?? null;
        },
      ),
      upsert: vi.fn(
        async ({
          where,
          create,
        }: {
          where: { sourceKey_sourceJobId: { sourceKey: string; sourceJobId: string } };
          create: { jobId: string; sourceKey: string; sourceJobId: string };
        }) => {
          const k = listingKey(
            where.sourceKey_sourceJobId.sourceKey,
            where.sourceKey_sourceJobId.sourceJobId,
          );
          listingStore.set(k, {
            jobId: create.jobId,
            sourceKey: create.sourceKey,
            sourceJobId: create.sourceJobId,
          });
          return listingStore.get(k);
        },
      ),
    },
  },
}));

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
import { recordSourceRun } from "@/lib/jobs/ingestion/source-run";
import { applyAbsenceFreshness } from "@/lib/jobs/ingestion/absence-freshness";
import { upsertSourceListing } from "@/lib/jobs/ingestion/provenance";
import type { IngestStats } from "@/lib/jobs/ingestion/types";

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

function ref(partial: Record<string, unknown> = {}) {
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

function emptyStats(sourceKey: string, over: Partial<IngestStats> = {}): IngestStats {
  return {
    sourceKey,
    startedAt: new Date().toISOString(),
    fetched: 0,
    validated: 0,
    created: 0,
    updated: 0,
    duplicates: 0,
    skipped: 0,
    qualityRejected: 0,
    failed: 0,
    timedOut: false,
    completeness: "PARTIAL",
    errors: [],
    ...over,
  };
}

function seedSource(key: string, over: Partial<SourceRow> = {}) {
  sourceStore.set(key, {
    key,
    enabled: true,
    consecutiveFailures: 0,
    jobsFetched: 0,
    jobsCreated: 0,
    jobsUpdated: 0,
    jobsSkipped: 0,
    healthStatus: "healthy",
    lastError: null,
    lastErrorAt: null,
    lastSuccessAt: null,
    lastSyncAt: null,
    lastSyncStatus: null,
    syncCursor: null,
    ...over,
  });
}

beforeEach(() => {
  jobStore.clear();
  sourceStore.clear();
  listingStore.clear();
  _resetRateLimitBuckets();
});

/* ========================================================================== */
/*  BUSINESS UNIT TESTS                                                       */
/* ========================================================================== */

describe("business: identity namespace", () => {
  it("namespaces raw ids and keeps sources distinct", () => {
    expect(makeNamespacedExternalId("greenhouse", "12345")).toBe(
      "greenhouse:12345",
    );
    expect(makeNamespacedExternalId("lever", "12345")).toBe("lever:12345");
    expect(makeNamespacedExternalId("arbeitnow", "arbeitnow:slug")).toBe(
      "arbeitnow:slug",
    );
    expect(parseNamespacedExternalId("arbeitnow:abc")).toEqual({
      sourceKey: "arbeitnow",
      sourceJobId: "abc",
    });
  });
});

describe("business: quality", () => {
  it("rejects weak / invalid records", () => {
    expect(assessJobQuality(draft({ title: "ab", company: "x" })).ok).toBe(
      false,
    );
    expect(assessJobQuality(draft({ applyUrl: "not-a-url" })).ok).toBe(false);
  });

  it("accepts complete job and keeps description", () => {
    const d = draft();
    const q = assessJobQuality(d);
    expect(q.ok).toBe(true);
    expect(d.description.length).toBeGreaterThan(20);
  });
});

describe("business: dedup", () => {
  it("L1 same externalId", () => {
    const m = scoreDedup(
      draft(),
      ref({ externalId: "arbeitnow:abc", title: "Other" }),
    );
    expect(m?.level).toBe(1);
  });

  it("different source same raw id is not L1", () => {
    const m = scoreDedup(
      draft({
        sourceKey: "greenhouse",
        externalId: "greenhouse:123",
      }),
      ref({ externalId: "lever:123" }),
    );
    expect(m?.level === 1).toBe(false);
  });

  it("L2/L3 URL match", () => {
    const url = "https://boards.example.com/jobs/99";
    expect(
      scoreDedup(
        draft({ externalUrl: url, externalId: "a:x" }),
        ref({ externalId: "b:y", externalUrl: url }),
      )?.level,
    ).toBe(2);
    expect(
      scoreDedup(
        draft({ applyUrl: url, externalId: "a:x", externalUrl: null }),
        ref({ externalId: "b:y", applyUrl: url }),
      )?.level,
    ).toBe(3);
  });

  it("employer jobs never match", () => {
    expect(
      scoreDedup(
        draft(),
        ref({ externalId: "arbeitnow:abc", postedById: "emp1" }),
      ),
    ).toBeNull();
  });

  it("same title different location does not merge", () => {
    expect(
      scoreDedup(
        draft(),
        ref({ externalId: "other:1", location: "Munich, Germany" }),
      ),
    ).toBeNull();
  });

  it("L4 company+title+location", () => {
    expect(scoreDedup(draft(), ref({ externalId: "other:1" }))?.level).toBe(4);
  });
});

describe("business: occupation + license", () => {
  it("classifies non-tech and tech", () => {
    expect(inferOccupation("Registered Nurse").occupationFamily).toBe(
      "healthcare",
    );
    expect(inferOccupation("Electrician").occupationFamily).toBe("trades");
    expect(inferOccupation("Cashier").occupation).toBe("cashier");
  });

  it("license gate blocks unknown; arbeitnow enabled", () => {
    expect(
      isProductionIngestAllowed({ enabled: true, licenseStatus: "UNKNOWN" }),
    ).toBe(false);
    expect(getEnabledSources().map((s) => s.key)).toContain("arbeitnow");
    for (const s of SOURCE_REGISTRY) {
      if (s.licenseStatus !== "APPROVED" || !s.redistributionAllowed) {
        expect(isProductionIngestAllowed(s)).toBe(false);
      }
    }
  });
});

describe("business: health + freshness + checkpoint + rate + url", () => {
  it("health thresholds", () => {
    expect(
      computeHealthStatus({
        enabled: true,
        consecutiveFailures: 0,
        fetched: 1,
        failed: 0,
        timedOut: false,
      }),
    ).toBe("HEALTHY");
    expect(
      computeHealthStatus({
        enabled: true,
        consecutiveFailures: HEALTH_THRESHOLDS.degradedAt,
        fetched: 0,
        failed: 1,
        timedOut: false,
      }),
    ).toBe("DEGRADED");
    expect(
      computeHealthStatus({
        enabled: true,
        consecutiveFailures: HEALTH_THRESHOLDS.failingAt,
        fetched: 0,
        failed: 3,
        timedOut: false,
      }),
    ).toBe("FAILING");
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

  it("absence only on FULL", () => {
    expect(mayApplyAbsenceFreshness("FULL")).toBe(true);
    expect(mayApplyAbsenceFreshness("PARTIAL")).toBe(false);
    expect(mayApplyAbsenceFreshness("FAILED")).toBe(false);
  });

  it("checkpoint parse", () => {
    expect(
      parseCheckpoint(
        JSON.stringify({ page: 3, updatedAt: "2026-01-01T00:00:00.000Z" }),
      )?.page,
    ).toBe(3);
    expect(parseCheckpoint("bad")).toBeNull();
  });

  it("rate limit isolation", () => {
    expect(tryAcquireSourceQuota("a", 1)).toBe(true);
    expect(tryAcquireSourceQuota("a", 1)).toBe(false);
    expect(tryAcquireSourceQuota("b", 1)).toBe(true);
  });

  it("URL validate + strip utm", () => {
    expect(isValidHttpUrl("https://x.com/a")).toBe(true);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    const n = normalizeJobUrl("https://Example.com/j?utm_source=x&id=1");
    expect(n).not.toContain("utm_source");
    expect(n).toContain("id=1");
  });
});

/* ========================================================================== */
/*  DB INTEGRATION (in-memory mock)                                           */
/* ========================================================================== */

describe("db integration: consecutiveFailures", () => {
  it("increments on hard fail and resets on success", async () => {
    seedSource("arbeitnow", { consecutiveFailures: 0 });

    await recordSourceRun(
      emptyStats("arbeitnow", {
        completeness: "FAILED",
        failed: 1,
        errors: ["http_500"],
      }),
    );
    expect(sourceStore.get("arbeitnow")?.consecutiveFailures).toBe(1);

    await recordSourceRun(
      emptyStats("arbeitnow", {
        completeness: "FAILED",
        failed: 1,
        errors: ["http_500"],
      }),
    );
    expect(sourceStore.get("arbeitnow")?.consecutiveFailures).toBe(2);

    await recordSourceRun(
      emptyStats("arbeitnow", {
        completeness: "FULL",
        fetched: 10,
        created: 2,
        errors: [],
      }),
    );
    expect(sourceStore.get("arbeitnow")?.consecutiveFailures).toBe(0);
    expect(sourceStore.get("arbeitnow")?.lastError).toBeNull();
  });
});

describe("db integration: absence freshness", () => {
  it("PARTIAL does not touch jobs", async () => {
    jobStore.set("j1", {
      id: "j1",
      externalId: "arbeitnow:old",
      source: "arbeitnow",
      status: "active",
      postedById: null,
      lastSeenAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      freshnessStatus: "fresh",
      title: "Old",
      location: "Berlin",
    });

    const r = await applyAbsenceFreshness({
      sourceKey: "arbeitnow",
      completeness: "PARTIAL",
      seenExternalIds: [],
    });
    expect(r.updated).toBe(0);
    expect(jobStore.get("j1")?.freshnessStatus).toBe("fresh");
  });

  it("FULL updates unseen imported jobs only; skips employer", async () => {
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    jobStore.set("imp", {
      id: "imp",
      externalId: "arbeitnow:gone",
      source: "arbeitnow",
      status: "active",
      postedById: null,
      lastSeenAt: old,
      freshnessStatus: "fresh",
      title: "Gone",
      location: "Berlin",
    });
    jobStore.set("seen", {
      id: "seen",
      externalId: "arbeitnow:seen",
      source: "arbeitnow",
      status: "active",
      postedById: null,
      lastSeenAt: old,
      freshnessStatus: "fresh",
      title: "Seen",
      location: "Berlin",
    });
    jobStore.set("emp", {
      id: "emp",
      externalId: null,
      source: null,
      status: "active",
      postedById: "employer_1",
      lastSeenAt: old,
      freshnessStatus: "fresh",
      title: "Employer Job",
      location: "Berlin",
    });

    const r = await applyAbsenceFreshness({
      sourceKey: "arbeitnow",
      completeness: "FULL",
      seenExternalIds: ["arbeitnow:seen"],
    });

    expect(r.updated).toBeGreaterThanOrEqual(1);
    expect(jobStore.get("imp")?.freshnessStatus).not.toBe("fresh");
    expect(jobStore.get("seen")?.freshnessStatus).toBe("fresh");
    expect(jobStore.get("emp")?.freshnessStatus).toBe("fresh");
  });
});

describe("db integration: provenance listing", () => {
  it("upserts JobSourceListing without touching employer path", async () => {
    await upsertSourceListing("job_1", draft());
    const k = listingKey("arbeitnow", "abc");
    expect(listingStore.get(k)?.jobId).toBe("job_1");

    await upsertSourceListing("job_1", draft());
    expect(listingStore.size).toBe(1);
  });
});

describe("db integration: employer protection on updateMany", () => {
  it("updateMany with postedById null does not modify employer rows", async () => {
    const { db } = await import("@/lib/db");
    jobStore.set("emp", {
      id: "emp",
      externalId: "arbeitnow:x",
      source: "arbeitnow",
      status: "active",
      postedById: "user_1",
      lastSeenAt: new Date(),
      freshnessStatus: "fresh",
      title: "Protected",
      location: "Berlin",
    });

    const result = await db.job.updateMany({
      where: { id: "emp", postedById: null },
      data: { title: "Hacked" },
    });
    expect(result.count).toBe(0);
    expect(jobStore.get("emp")?.title).toBe("Protected");
  });
});
