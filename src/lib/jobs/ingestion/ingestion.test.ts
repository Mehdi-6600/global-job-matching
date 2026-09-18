import { describe, expect, it } from "vitest";
import { assessJobQuality } from "@/lib/jobs/ingestion/quality";
import { scoreDedup } from "@/lib/jobs/ingestion/dedup";
import { inferOccupation } from "@/lib/jobs/ingestion/occupation";
import {
  isProductionIngestAllowed,
  SOURCE_REGISTRY,
  getEnabledSources,
} from "@/lib/jobs/ingestion/registry";
import type { IngestJobDraft } from "@/lib/jobs/ingestion/types";

function draft(partial: Partial<IngestJobDraft> = {}): IngestJobDraft {
  return {
    sourceKey: "arbeitnow",
    sourceJobId: "abc",
    externalId: "arbeitnow:abc",
    title: "Warehouse Worker",
    company: "Logistics Co",
    location: "Berlin, Germany",
    description: "Move goods, operate scanner, follow safety rules every day.",
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
});

describe("ingestion dedup", () => {
  it("matches same externalId at level 1", () => {
    const m = scoreDedup(draft(), {
      id: "j1",
      externalId: "arbeitnow:abc",
      externalUrl: null,
      title: "Other",
      location: "Munich",
      postedById: null,
      companyName: "Other Co",
    });
    expect(m?.level).toBe(1);
    expect(m?.confidence).toBeGreaterThanOrEqual(0.98);
  });

  it("never matches employer-owned jobs", () => {
    const m = scoreDedup(draft(), {
      id: "j2",
      externalId: "arbeitnow:abc",
      externalUrl: null,
      title: "Warehouse Worker",
      location: "Berlin, Germany",
      postedById: "user_employer_1",
      companyName: "Logistics Co",
    });
    expect(m).toBeNull();
  });

  it("does not merge same title different location", () => {
    const m = scoreDedup(draft(), {
      id: "j3",
      externalId: "arbeitnow:other",
      externalUrl: null,
      title: "Warehouse Worker",
      location: "Munich, Germany",
      postedById: null,
      companyName: "Logistics Co",
    });
    expect(m).toBeNull();
  });

  it("matches company+title+same location", () => {
    const m = scoreDedup(draft(), {
      id: "j4",
      externalId: "other:1",
      externalUrl: null,
      title: "Warehouse Worker",
      location: "Berlin, Germany",
      postedById: null,
      companyName: "Logistics Co",
    });
    expect(m?.level).toBe(4);
  });
});

describe("occupation intelligence", () => {
  it("classifies non-tech and tech titles", () => {
    expect(inferOccupation("Registered Nurse").occupationFamily).toBe(
      "healthcare"
    );
    expect(inferOccupation("Electrician").occupationFamily).toBe("trades");
    expect(inferOccupation("Senior Software Engineer").occupation).toBe(
      "software_engineer"
    );
    expect(inferOccupation("Cashier").occupation).toBe("cashier");
  });
});

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
});
