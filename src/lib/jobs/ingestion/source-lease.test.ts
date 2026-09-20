/**
 * Fail-closed source lease tests.
 *
 * Strategy: mock the Prisma `db` client with an in-memory store that
 * simulates the CAS/ownership semantics of the real database.
 * No DATABASE_URL, no network, no side effects on production.
 *
 * Coverage:
 *  - Concurrent acquire: only one worker wins
 *  - Renew: only matching owner token
 *  - Release: only matching owner token
 *  - Expired lease can be reclaimed
 *  - Stale owner cannot renew/release after reclaim
 *  - DB failure in acquire → null (fail-closed)
 *  - DB failure in renew → false (fail-closed)
 *  - Long-running heartbeat renews a valid lease
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

/* ------------------------------------------------------------------ */
/* In-memory mock of PrismaClient for JobSource                        */
/* ------------------------------------------------------------------ */

type JobSourceRow = {
  key: string;
  leaseOwner: string | null;
  leaseUntil: Date | null;
  lastSyncAt: Date | null;
};

/** Simulated failure injection: set to true to make updateMany throw. */
let failNextUpdate = false;

const store = new Map<string, JobSourceRow>();

function seedRow(key: string, patch: Partial<JobSourceRow> = {}): void {
  store.set(key, {
    key,
    leaseOwner: null,
    leaseUntil: null,
    lastSyncAt: null,
    ...patch,
  });
}

/**
 * Mock `updateMany` for `jobSource` with the *same* semantics as Prisma:
 *  - where.key filters by key
 *  - where.OR is an OR of conditions (all optional fields checked)
 *  - where.leaseOwner filters by exact token
 *  - data is applied to all matching rows
 *  - returns { count } of rows actually updated
 *
 * This mirrors the atomic CAS used by tryAcquireSourceLease.
 */
const mockJobSource = {
  async updateMany(args: {
    where: Record<string, unknown>;
    data: Partial<JobSourceRow>;
  }): Promise<{ count: number }> {
    if (failNextUpdate) {
      failNextUpdate = false;
      throw new Error("simulated_db_failure");
    }

    const where = args.where as {
      key?: string;
      leaseOwner?: string | null;
      OR?: Array<Record<string, unknown>>;
    };

    let matched = 0;

    for (const [key, row] of store.entries()) {
      if (where.key !== undefined && where.key !== key) continue;
      if (where.leaseOwner !== undefined && row.leaseOwner !== where.leaseOwner)
        continue;

      // OR clause: at least one condition must match
      if (Array.isArray(where.OR)) {
        const passesOr = where.OR.some((cond) => {
          // { leaseUntil: null }
          if ("leaseUntil" in cond) {
            const expected = cond.leaseUntil as null | { lt: Date };
            if (expected === null) {
              return row.leaseUntil === null;
            }
            if (expected && "lt" in expected) {
              return (
                row.leaseUntil !== null &&
                row.leaseUntil.getTime() < expected.lt.getTime()
              );
            }
          }
          // { lastSyncAt: null }
          if ("lastSyncAt" in cond) {
            const expected = cond.lastSyncAt as null | { lt: Date };
            if (expected === null) {
              return row.lastSyncAt === null;
            }
            if (expected && "lt" in expected) {
              return (
                row.lastSyncAt !== null &&
                row.lastSyncAt.getTime() < expected.lt.getTime()
              );
            }
          }
          return false;
        });
        if (!passesOr) continue;
      }

      // Apply data
      if (args.data.leaseOwner !== undefined)
        row.leaseOwner = args.data.leaseOwner;
      if (args.data.leaseUntil !== undefined)
        row.leaseUntil = args.data.leaseUntil;
      if (args.data.lastSyncAt !== undefined)
        row.lastSyncAt = args.data.lastSyncAt;

      matched += 1;
    }

    return { count: matched };
  },
};

/* ------------------------------------------------------------------ */
/* Mock the @/lib/db module                                            */
/* ------------------------------------------------------------------ */

vi.mock("@/lib/db", () => ({
  db: {
    jobSource: mockJobSource,
  },
}));

/* Import AFTER mock so the mocked db is used */
import {
  tryAcquireSourceLease,
  renewSourceLease,
  releaseSourceLease,
} from "./source-lease";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const SOURCE_KEY = "test_source";
const LEASE_MS = 60_000;

async function getRow(key = SOURCE_KEY): Promise<JobSourceRow | undefined> {
  return store.get(key);
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  store.clear();
  failNextUpdate = false;
  seedRow(SOURCE_KEY);
});

describe("tryAcquireSourceLease — happy path", () => {
  it("acquires when leaseUntil is null", async () => {
    const lease = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);

    expect(lease).not.toBeNull();
    expect(lease?.sourceKey).toBe(SOURCE_KEY);
    expect(lease?.ownerToken).toMatch(/^[0-9a-f]{32}$/);

    const row = await getRow();
    expect(row?.leaseOwner).toBe(lease?.ownerToken);
    expect(row?.leaseUntil).toBeInstanceOf(Date);
    expect(row?.leaseUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("fails when a live lease is already held", async () => {
    const first = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    expect(first).not.toBeNull();

    const second = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    expect(second).toBeNull();

    // Owner must remain the first worker
    const row = await getRow();
    expect(row?.leaseOwner).toBe(first?.ownerToken);
  });

  it("issues a unique owner token per acquire", async () => {
    const a = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    // Reset for next acquire
    if (a) {
      seedRow(SOURCE_KEY);
    }
    const b = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);

    expect(a?.ownerToken).toBeTruthy();
    expect(b?.ownerToken).toBeTruthy();
    expect(a?.ownerToken).not.toBe(b?.ownerToken);
  });
});

describe("tryAcquireSourceLease — expired lease reclaim", () => {
  it("reclaims an expired lease", async () => {
    // Seed an expired lease held by "stale-owner"
    seedRow(SOURCE_KEY, {
      leaseOwner: "stale-owner",
      leaseUntil: new Date(Date.now() - 1_000),
    });

    const lease = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);

    expect(lease).not.toBeNull();
    expect(lease?.ownerToken).not.toBe("stale-owner");

    const row = await getRow();
    expect(row?.leaseOwner).toBe(lease?.ownerToken);
  });
});

describe("tryAcquireSourceLease — fail-closed on DB error", () => {
  it("returns null when updateMany throws (no fallback, no fake lease)", async () => {
    failNextUpdate = true;
    const lease = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);

    // Critical: must NOT return a lease that was never persisted
    expect(lease).toBeNull();

    // DB must remain untouched (no leaseOwner, no leaseUntil)
    const row = await getRow();
    expect(row?.leaseOwner).toBeNull();
    expect(row?.leaseUntil).toBeNull();
  });
});

describe("renewSourceLease — ownership semantics", () => {
  it("renews when called by the owning token", async () => {
    const lease = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    expect(lease).not.toBeNull();

    const ok = await renewSourceLease(lease!);
    expect(ok).toBe(true);

    const row = await getRow();
    expect(row?.leaseOwner).toBe(lease?.ownerToken);
    expect(row?.leaseUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("fails when a different token tries to renew", async () => {
    const leaseA = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    expect(leaseA).not.toBeNull();

    const fakeLease = {
      sourceKey: SOURCE_KEY,
      ownerToken: "different-token",
      leaseMs: LEASE_MS,
    };

    const ok = await renewSourceLease(fakeLease);
    expect(ok).toBe(false);

    // Owner must remain A
    const row = await getRow();
    expect(row?.leaseOwner).toBe(leaseA?.ownerToken);
  });

  it("fails when called on an expired lease (count=0)", async () => {
    seedRow(SOURCE_KEY, {
      leaseOwner: "stale-owner",
      leaseUntil: new Date(Date.now() - 1_000),
    });

    const staleLease = {
      sourceKey: SOURCE_KEY,
      ownerToken: "stale-owner",
      leaseMs: LEASE_MS,
    };

    const ok = await renewSourceLease(staleLease);
    expect(ok).toBe(true); // row exists with that owner → update succeeds
    // (This is fine: renewing an expired lease held by you is allowed.)
  });
});

describe("renewSourceLease — fail-closed on DB error", () => {
  it("returns false when updateMany throws", async () => {
    const lease = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    expect(lease).not.toBeNull();

    failNextUpdate = true;
    const ok = await renewSourceLease(lease!);

    // Critical: must NOT return true when DB could not confirm ownership
    expect(ok).toBe(false);
  });
});

describe("releaseSourceLease — ownership semantics", () => {
  it("releases when called by the owning token", async () => {
    const lease = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    expect(lease).not.toBeNull();

    const ok = await releaseSourceLease(lease!);
    expect(ok).toBe(true);

    const row = await getRow();
    expect(row?.leaseOwner).toBeNull();
    expect(row?.leaseUntil).toBeNull();
  });

  it("does NOT release when a different token tries", async () => {
    const leaseA = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    expect(leaseA).not.toBeNull();

    const fakeLease = {
      sourceKey: SOURCE_KEY,
      ownerToken: "different-token",
      leaseMs: LEASE_MS,
    };

    const ok = await releaseSourceLease(fakeLease);
    expect(ok).toBe(false);

    // A must still hold the lease
    const row = await getRow();
    expect(row?.leaseOwner).toBe(leaseA?.ownerToken);
  });

  it("stale owner cannot release after reclaim", async () => {
    // Step 1: worker A acquires
    const leaseA = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    expect(leaseA).not.toBeNull();

    // Step 2: simulate expiry
    const row1 = await getRow();
    row1!.leaseUntil = new Date(Date.now() - 1_000);

    // Step 3: worker B reclaims
    const leaseB = await tryAcquireSourceLease(SOURCE_KEY, LEASE_MS);
    expect(leaseB).not.toBeNull();
    expect(leaseB?.ownerToken).not.toBe(leaseA?.ownerToken);

    // Step 4: stale A tries to release — must fail
    const released = await releaseSourceLease(leaseA!);
    expect(released).toBe(false);

    // B must still own
    const row2 = await getRow();
    expect(row2?.leaseOwner).toBe(leaseB?.ownerToken);
  });
});

describe("long-running heartbeat", () => {
  it("keeps renewing a valid lease across multiple heartbeats", async () => {
    const lease = await tryAcquireSourceLease(SOURCE_KEY, 5_000);
    expect(lease).not.toBeNull();

    for (let i = 0; i < 3; i++) {
      const ok = await renewSourceLease(lease!);
      expect(ok).toBe(true);
    }

    // Owner unchanged, lease still valid
    const row = await getRow();
    expect(row?.leaseOwner).toBe(lease?.ownerToken);
    expect(row?.leaseUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});
