/**
 * Tests for ats-discovery and ats-seeding.
 *
 * The core invariant under test: discovery NEVER grants ingestion
 * rights. New rows always start DISABLED from a legal perspective,
 * and existing rows' legal fields are never touched by seeding.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/* In-memory SourceCompany store                                       */
/* ------------------------------------------------------------------ */

type Row = {
  id: string;
  provider: string;
  boardIdentifier: string;
  companyName: string;
  country: string | null;
  language: string | null;
  status: string;
  legalStatus: string;
  robotsStatus: string;
  termsStatus: string;
  healthStatus: string;
  consecutiveFailures: number;
  lastErrorAt: Date | null;
  lastError: string | null;
  lastCheckedAt: Date | null;
  lastSuccessAt: Date | null;
  discoveredAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const store = new Map<string, Row>();
let idCounter = 0;

function key(provider: string, board: string) {
  return `${provider}::${board}`;
}

function seedRow(
  provider: string,
  board: string,
  patch: Partial<Row> = {},
): Row {
  const now = new Date();
  const row: Row = {
    id: `sc_${++idCounter}`,
    provider,
    boardIdentifier: board,
    companyName: patch.companyName ?? `${provider} ${board}`,
    country: null,
    language: null,
    status: "discovered",
    legalStatus: "UNKNOWN",
    robotsStatus: "unknown",
    termsStatus: "unknown",
    healthStatus: "unknown",
    consecutiveFailures: 0,
    lastErrorAt: null,
    lastError: null,
    lastCheckedAt: null,
    lastSuccessAt: null,
    discoveredAt: now,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
  store.set(key(provider, board), row);
  return row;
}

/* ------------------------------------------------------------------ */
/* Prisma mock                                                         */
/* ------------------------------------------------------------------ */

vi.mock("@/lib/db", () => ({
  db: {
    sourceCompany: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: {
            provider_boardIdentifier: {
              provider: string;
              boardIdentifier: string;
            };
          };
        }) => {
          const k = key(
            where.provider_boardIdentifier.provider,
            where.provider_boardIdentifier.boardIdentifier,
          );
          return store.get(k) ?? null;
        },
      ),
      findMany: vi.fn(
        async (args?: {
          where?: Record<string, unknown>;
          take?: number;
        }) => {
          let rows = [...store.values()];
          if (args?.where) {
            const w = args.where as Record<string, unknown>;
            for (const [k, v] of Object.entries(w)) {
              if (k === "OR" || Array.isArray(v)) continue;
              rows = rows.filter(
                (r) => (r as unknown as Record<string, unknown>)[k] === v,
              );
            }
          }
          return args?.take ? rows.slice(0, args.take) : rows;
        },
      ),
      create: vi.fn(async ({ data }: { data: Partial<Row> }) => {
        const now = new Date();
        const row: Row = {
          id: `sc_${++idCounter}`,
          provider: data.provider!,
          boardIdentifier: data.boardIdentifier!,
          companyName: data.companyName!,
          country: data.country ?? null,
          language: data.language ?? null,
          status: data.status ?? "discovered",
          legalStatus: data.legalStatus ?? "UNKNOWN",
          robotsStatus: data.robotsStatus ?? "unknown",
          termsStatus: data.termsStatus ?? "unknown",
          healthStatus: data.healthStatus ?? "unknown",
          consecutiveFailures: 0,
          lastErrorAt: null,
          lastError: null,
          lastCheckedAt: null,
          lastSuccessAt: null,
          discoveredAt: now,
          createdAt: now,
          updatedAt: now,
        };
        store.set(key(row.provider, row.boardIdentifier), row);
        return row;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where:
            | { id: string }
            | {
                provider_boardIdentifier: {
                  provider: string;
                  boardIdentifier: string;
                };
              };
          data: Partial<Row>;
        }) => {
          let row: Row | undefined;
          if ("id" in where) {
            row = [...store.values()].find((r) => r.id === where.id);
          } else {
            const w = where.provider_boardIdentifier;
            row = store.get(key(w.provider, w.boardIdentifier));
          }
          if (!row) throw new Error("not found");
          Object.assign(row, data, { updatedAt: new Date() });
          return row;
        },
      ),
    },
  },
}));

import {
  getEligibleBoards,
  recordBoardCheck,
  normalizeAtsCompanyName,
} from "./ats-discovery";
import { seedAtsBoards, registerAtsBoard, summarizeAtsBoards } from "./ats-seeding";
import { ATS_SEED_BOARDS } from "./ats-seed-boards";

beforeEach(() => {
  store.clear();
  idCounter = 0;
});

/* ------------------------------------------------------------------ */
/* getEligibleBoards — fail-closed                                     */
/* ------------------------------------------------------------------ */

describe("getEligibleBoards — fail-closed legal gate", () => {
  it("returns empty when no rows exist", async () => {
    const r = await getEligibleBoards("greenhouse");
    expect(r).toEqual([]);
  });

  it("excludes rows with status='discovered'", async () => {
    seedRow("greenhouse", "acme", {
      status: "discovered",
      legalStatus: "APPROVED",
      robotsStatus: "allowed",
      termsStatus: "allowed",
    });
    const r = await getEligibleBoards("greenhouse");
    expect(r).toEqual([]);
  });

  it("excludes rows with legalStatus != APPROVED", async () => {
    seedRow("greenhouse", "acme", {
      status: "active",
      legalStatus: "UNKNOWN",
      robotsStatus: "allowed",
      termsStatus: "allowed",
    });
    const r = await getEligibleBoards("greenhouse");
    expect(r).toEqual([]);
  });

  it("excludes rows with robotsStatus != allowed", async () => {
    seedRow("greenhouse", "acme", {
      status: "active",
      legalStatus: "APPROVED",
      robotsStatus: "unknown",
      termsStatus: "allowed",
    });
    const r = await getEligibleBoards("greenhouse");
    expect(r).toEqual([]);
  });

  it("excludes rows with termsStatus != allowed", async () => {
    seedRow("greenhouse", "acme", {
      status: "active",
      legalStatus: "APPROVED",
      robotsStatus: "allowed",
      termsStatus: "restricted",
    });
    const r = await getEligibleBoards("greenhouse");
    expect(r).toEqual([]);
  });

  it("includes only fully-approved active rows", async () => {
    seedRow("greenhouse", "good", {
      status: "active",
      legalStatus: "APPROVED",
      robotsStatus: "allowed",
      termsStatus: "allowed",
    });
    seedRow("greenhouse", "bad", {
      status: "active",
      legalStatus: "UNKNOWN",
      robotsStatus: "allowed",
      termsStatus: "allowed",
    });
    const r = await getEligibleBoards("greenhouse");
    expect(r).toHaveLength(1);
    expect(r[0].boardIdentifier).toBe("good");
  });

  it("scopes by provider", async () => {
    seedRow("greenhouse", "a", {
      status: "active",
      legalStatus: "APPROVED",
      robotsStatus: "allowed",
      termsStatus: "allowed",
    });
    seedRow("lever", "b", {
      status: "active",
      legalStatus: "APPROVED",
      robotsStatus: "allowed",
      termsStatus: "allowed",
    });
    const gh = await getEligibleBoards("greenhouse");
    const lv = await getEligibleBoards("lever");
    expect(gh).toHaveLength(1);
    expect(gh[0].boardIdentifier).toBe("a");
    expect(lv).toHaveLength(1);
    expect(lv[0].boardIdentifier).toBe("b");
  });
});

/* ------------------------------------------------------------------ */
/* recordBoardCheck                                                    */
/* ------------------------------------------------------------------ */

describe("recordBoardCheck", () => {
  it("resets counters on success", async () => {
    seedRow("greenhouse", "acme", { consecutiveFailures: 3, healthStatus: "failing" });
    await recordBoardCheck("greenhouse", "acme", { ok: true });
    const row = store.get(key("greenhouse", "acme"))!;
    expect(row.consecutiveFailures).toBe(0);
    expect(row.healthStatus).toBe("healthy");
    expect(row.lastSuccessAt).toBeInstanceOf(Date);
  });

  it("increments and marks degraded on 1st failure", async () => {
    seedRow("greenhouse", "acme");
    await recordBoardCheck("greenhouse", "acme", { ok: false, error: "http_500" });
    const row = store.get(key("greenhouse", "acme"))!;
    expect(row.consecutiveFailures).toBe(1);
    expect(row.healthStatus).toBe("degraded");
    expect(row.lastError).toBe("http_500");
  });

  it("marks failing on 3rd failure", async () => {
    seedRow("greenhouse", "acme", { consecutiveFailures: 2 });
    await recordBoardCheck("greenhouse", "acme", { ok: false, error: "timeout" });
    const row = store.get(key("greenhouse", "acme"))!;
    expect(row.consecutiveFailures).toBe(3);
    expect(row.healthStatus).toBe("failing");
  });

  it("truncates error to 500 chars", async () => {
    seedRow("greenhouse", "acme");
    const long = "x".repeat(2000);
    await recordBoardCheck("greenhouse", "acme", { ok: false, error: long });
    const row = store.get(key("greenhouse", "acme"))!;
    expect(row.lastError?.length).toBe(500);
  });

  it("never throws on missing row", async () => {
    await expect(
      recordBoardCheck("greenhouse", "missing", { ok: true }),
    ).resolves.toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* normalizeAtsCompanyName                                             */
/* ------------------------------------------------------------------ */

describe("normalizeAtsCompanyName", () => {
  it("collapses whitespace", () => {
    expect(normalizeAtsCompanyName("  Acme   Inc  ")).toBe("Acme Inc");
  });

  it("truncates to 200", () => {
    const long = "a".repeat(500);
    expect(normalizeAtsCompanyName(long).length).toBe(200);
  });
});

/* ------------------------------------------------------------------ */
/* seedAtsBoards — must NEVER grant legal rights                       */
/* ------------------------------------------------------------------ */

describe("seedAtsBoards", () => {
  it("creates rows with fail-closed defaults", async () => {
    const results = await seedAtsBoards();
    expect(results.length).toBe(ATS_SEED_BOARDS.length);
    for (const r of results) {
      expect(r.action).toBe("created");
      const row = store.get(key(r.provider, r.boardIdentifier))!;
      expect(row.status).toBe("discovered");
      expect(row.legalStatus).toBe("UNKNOWN");
      expect(row.robotsStatus).toBe("unknown");
      expect(row.termsStatus).toBe("unknown");
    }
  });

  it("is idempotent — second run is unchanged", async () => {
    await seedAtsBoards();
    const second = await seedAtsBoards();
    for (const r of second) {
      expect(r.action).toBe("unchanged");
    }
  });

  it("NEVER downgrades an operator-approved board", async () => {
    seedRow("greenhouse", "stripe", {
      companyName: "Stripe",
      status: "active",
      legalStatus: "APPROVED",
      robotsStatus: "allowed",
      termsStatus: "allowed",
    });
    await seedAtsBoards();
    const row = store.get(key("greenhouse", "stripe"))!;
    expect(row.status).toBe("active");
    expect(row.legalStatus).toBe("APPROVED");
    expect(row.robotsStatus).toBe("allowed");
    expect(row.termsStatus).toBe("allowed");
  });

  it("refreshes only safe metadata when companyName changes", async () => {
    seedRow("greenhouse", "stripe", {
      companyName: "Old Name",
      status: "active",
      legalStatus: "APPROVED",
      robotsStatus: "allowed",
      termsStatus: "allowed",
    });
    await seedAtsBoards();
    const row = store.get(key("greenhouse", "stripe"))!;
    expect(row.companyName).toBe("Stripe");
    expect(row.legalStatus).toBe("APPROVED");
    expect(row.status).toBe("active");
  });
});

/* ------------------------------------------------------------------ */
/* registerAtsBoard                                                    */
/* ------------------------------------------------------------------ */

describe("registerAtsBoard", () => {
  it("creates a single board fail-closed", async () => {
    const r = await registerAtsBoard({
      provider: "lever",
      boardIdentifier: "test-co",
      companyName: "Test Co",
      language: "en",
    });
    expect(r.action).toBe("created");
    const row = store.get(key("lever", "test-co"))!;
    expect(row.status).toBe("discovered");
    expect(row.legalStatus).toBe("UNKNOWN");
  });
});

/* ------------------------------------------------------------------ */
/* summarizeAtsBoards                                                  */
/* ------------------------------------------------------------------ */

describe("summarizeAtsBoards", () => {
  it("aggregates by provider/status/legalStatus", async () => {
    seedRow("greenhouse", "a", { status: "active", legalStatus: "APPROVED" });
    seedRow("greenhouse", "b", { status: "discovered", legalStatus: "UNKNOWN" });
    seedRow("lever", "c", { status: "active", legalStatus: "APPROVED" });
    const s = await summarizeAtsBoards();
    expect(s.total).toBe(3);
    expect(s.byProvider.greenhouse).toBe(2);
    expect(s.byProvider.lever).toBe(1);
    expect(s.byStatus.active).toBe(2);
    expect(s.byStatus.discovered).toBe(1);
    expect(s.byLegalStatus.APPROVED).toBe(2);
    expect(s.byLegalStatus.UNKNOWN).toBe(1);
  });
});
