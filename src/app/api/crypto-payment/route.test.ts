import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Regression: a submitted crypto transaction is recorded as "pending" only.
// Underpaid, not-found, unavailable and duplicate/replayed hashes must not
// create a transaction, and a concurrent duplicate hash must yield 409 (the
// same response as the sequential duplicate), never 500. No real network,
// funds or database are touched.

const mocks = vi.hoisted(() => ({
  verifyTxOnChain: vi.fn(),
  loadValidIntentForUser: vi.fn(),
  activatePlanForUser: vi.fn(),
  db: {
    transaction: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
  prisma: {
    paymentIntent: { updateMany: vi.fn(), update: vi.fn() },
    transaction: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user-1", role: "JOB_SEEKER" } })),
}));
vi.mock("@/lib/ratelimit", () => ({
  ratelimit: { limit: vi.fn(async () => ({ success: true })) },
}));
vi.mock("@/lib/client-ip", () => ({ getRequestIp: () => "203.0.113.7" }));
vi.mock("@/lib/db", () => ({
  db: {
    transaction: mocks.db.transaction,
    $transaction: mocks.db.$transaction,
  },
}));
vi.mock("@/lib/payment/plans", () => ({
  PLAN_PRICES: {},
  getCryptoWallets: () => [],
  getCryptoWallet: () => ({
    type: "ETH",
    name: "Test ETH",
    address: "0xRecipient000000000000000000000000000001",
  }),
}));
vi.mock("@/lib/subscription", () => ({
  getEffectivePlan: vi.fn(async () => ({ plan: "free" })),
  activatePlanForUser: mocks.activatePlanForUser,
}));
vi.mock("@/lib/payment/intent", () => ({
  loadValidIntentForUser: mocks.loadValidIntentForUser,
}));
vi.mock("@/lib/payment/verify-crypto", () => ({
  isPlausibleTxHash: () => true,
  verifyTxOnChain: mocks.verifyTxOnChain,
}));

import { POST } from "@/app/api/crypto-payment/route";

const TX_HASH = "0x" + "b".repeat(64);

const intent = {
  id: "intent-1",
  userId: "user-1",
  status: "pending",
  cryptoType: "ETH",
  recipientAddress: "0xRecipient000000000000000000000000000001",
  expectedCryptoAmount: "0.5",
  amountUsd: "10",
  rateUsd: "2000",
  planId: "pro",
  billingCycle: "monthly",
};

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/crypto-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

function expectNoTransactionCreated() {
  expect(mocks.db.$transaction).not.toHaveBeenCalled();
  expect(mocks.prisma.transaction.create).not.toHaveBeenCalled();
  expect(mocks.activatePlanForUser).not.toHaveBeenCalled();
}

beforeEach(() => {
  mocks.loadValidIntentForUser.mockReset();
  mocks.loadValidIntentForUser.mockResolvedValue({ ok: true, intent });
  mocks.verifyTxOnChain.mockReset();
  mocks.db.transaction.findUnique.mockReset();
  mocks.db.transaction.findUnique.mockResolvedValue(null);
  mocks.db.transaction.findFirst.mockReset();
  mocks.db.transaction.findFirst.mockResolvedValue(null);
  mocks.db.transaction.count.mockReset();
  mocks.db.transaction.count.mockResolvedValue(0);
  mocks.db.$transaction.mockReset();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(mocks.prisma)
  );
  mocks.prisma.paymentIntent.updateMany.mockReset();
  mocks.prisma.paymentIntent.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.paymentIntent.update.mockReset();
  mocks.prisma.transaction.create.mockReset();
  mocks.prisma.transaction.create.mockResolvedValue({
    id: "tx-1",
    planId: "pro",
    amount: 10,
    billingCycle: "monthly",
    status: "pending",
    cryptoType: "ETH",
    createdAt: new Date("2026-10-14T00:00:00Z"),
  });
  mocks.activatePlanForUser.mockReset();
});

describe("POST /api/crypto-payment: submission never activates a plan", () => {
  it("records a verified submission as pending only", async () => {
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "confirmed",
      found: true,
      amountMatched: true,
      recipientMatched: true,
    });

    const res = await post({ paymentIntentId: "intent-1", txHash: TX_HASH });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transaction.status).toBe("pending");
    expect(mocks.prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "pending", type: "crypto" }),
    });
    expect(mocks.activatePlanForUser).not.toHaveBeenCalled();
  });

  it("rejects an underpaid submission and records nothing", async () => {
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "failed",
      found: true,
      note: "Amount mismatch: got 0.4, expected ~0.5",
      amountMatched: false,
    });

    const res = await post({ paymentIntentId: "intent-1", txHash: TX_HASH });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "TX_FAILED_ON_CHAIN" });
    expectNoTransactionCreated();
  });

  it("rejects an unknown transaction and records nothing", async () => {
    mocks.verifyTxOnChain.mockResolvedValue({ status: "not_found", found: false });

    const res = await post({ paymentIntentId: "intent-1", txHash: TX_HASH });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "TX_NOT_FOUND" });
    expectNoTransactionCreated();
  });

  it("fails closed when verification is unavailable", async () => {
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "verification_unavailable",
      found: false,
    });

    const res = await post({ paymentIntentId: "intent-1", txHash: TX_HASH });

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "VERIFICATION_UNAVAILABLE" });
    expectNoTransactionCreated();
  });

  it("rejects a sequential replay of a known hash with 409 DUPLICATE_TX", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue({ id: "tx-old" });

    const res = await post({ paymentIntentId: "intent-1", txHash: TX_HASH });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "DUPLICATE_TX" });
    expect(mocks.verifyTxOnChain).not.toHaveBeenCalled();
    expectNoTransactionCreated();
  });

  it("maps a concurrent duplicate hash (unique violation) to 409, not 500", async () => {
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "confirmed",
      found: true,
      amountMatched: true,
      recipientMatched: true,
    });
    // The pre-check passed, but a parallel request inserted the same hash first.
    mocks.db.$transaction.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: { target: ["txHash"] },
      })
    );

    const res = await post({ paymentIntentId: "intent-1", txHash: TX_HASH });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "DUPLICATE_TX" });
  });

  it("maps a concurrent reuse of the same intent to 409 INTENT_ALREADY_USED", async () => {
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "confirmed",
      found: true,
      amountMatched: true,
      recipientMatched: true,
    });
    mocks.db.$transaction.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: { target: ["paymentIntentId"] },
      })
    );

    const res = await post({ paymentIntentId: "intent-1", txHash: TX_HASH });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "INTENT_ALREADY_USED" });
  });

  it("keeps other unexpected database errors as 500", async () => {
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "confirmed",
      found: true,
      amountMatched: true,
      recipientMatched: true,
    });
    mocks.db.$transaction.mockRejectedValue(new Error("connection reset"));

    const res = await post({ paymentIntentId: "intent-1", txHash: TX_HASH });

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Same on-chain payment, different spelling of the hash (case, 0x prefix,
// surrounding whitespace). The database is simulated with Postgres semantics:
// findUnique and the unique index compare exact strings, findFirst with
// mode "insensitive" compares case-insensitively.
// ---------------------------------------------------------------------------

type Row = { id: string; txHash: string };

function makeStore(seed: Row[] = []) {
  const rows: Row[] = [...seed];
  const exact = (v: string) => (r: Row) => r.txHash === v;
  const ci = (v: string) => (r: Row) => r.txHash.toLowerCase() === v.toLowerCase();
  // Supports the shapes the route uses: { txHash } and { OR: [{ txHash: { equals, mode } }] }.
  function matcher(where: any): (r: Row) => boolean {
    if (where.OR) {
      const subs = where.OR.map((c: any) => matcher(c));
      return (r) => subs.some((f: (r: Row) => boolean) => f(r));
    }
    const t = where.txHash;
    if (typeof t === "string") return exact(t);
    if (t && typeof t.equals === "string") {
      return t.mode === "insensitive" ? ci(t.equals) : exact(t.equals);
    }
    throw new Error("unsupported where in test store: " + JSON.stringify(where));
  }
  mocks.db.transaction.findUnique.mockImplementation(async ({ where }: any) => {
    return rows.find(matcher(where)) ?? null;
  });
  mocks.db.transaction.findFirst.mockImplementation(async ({ where }: any) => {
    return rows.find(matcher(where)) ?? null;
  });
  mocks.prisma.transaction.create.mockImplementation(async ({ data }: any) => {
    // Unique index on txHash: exact string comparison, like PostgreSQL.
    if (rows.some(exact(data.txHash))) {
      throw Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: { target: ["txHash"] },
      });
    }
    const row = { id: `tx-${rows.length + 1}`, txHash: data.txHash };
    rows.push(row);
    return { ...row, status: "pending", amount: 10, billingCycle: "monthly", cryptoType: "ETH", createdAt: new Date() };
  });
  return rows;
}

function intentWithId(id: string) {
  return { ...intent, id };
}

const DIGEST = "abcdef0123456789".repeat(4); // 64 hex characters

describe("POST /api/crypto-payment: one on-chain payment cannot be recorded twice", () => {
  beforeEach(() => {
    mocks.loadValidIntentForUser.mockImplementation(async (id: string) => ({
      ok: true,
      intent: intentWithId(id),
    }));
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "confirmed",
      found: true,
      amountMatched: true,
      recipientMatched: true,
    });
  });

  it("rejects the same hash with different letter case for a second intent", async () => {
    const rows = makeStore();
    const first = await post({ paymentIntentId: "intent-1", txHash: "0x" + DIGEST });
    expect(first.status).toBe(200);

    const second = await post({
      paymentIntentId: "intent-2",
      txHash: "0x" + DIGEST.toUpperCase(),
    });

    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({ code: "DUPLICATE_TX" });
    expect(rows).toHaveLength(1);
  });

  it("rejects the same digest without the 0x prefix", async () => {
    const rows = makeStore();
    expect((await post({ paymentIntentId: "intent-1", txHash: "0x" + DIGEST })).status).toBe(200);

    const res = await post({ paymentIntentId: "intent-2", txHash: DIGEST });

    expect(res.status).toBe(409);
    expect(rows).toHaveLength(1);
  });

  it("rejects surrounding whitespace around the same hash", async () => {
    const rows = makeStore();
    expect((await post({ paymentIntentId: "intent-1", txHash: "0x" + DIGEST })).status).toBe(200);

    const res = await post({ paymentIntentId: "intent-2", txHash: "  0x" + DIGEST.toUpperCase() + " " });

    expect(res.status).toBe(409);
    expect(rows).toHaveLength(1);
  });

  it("rejects a variant of a legacy row that was stored with mixed case", async () => {
    // Rows written before this change may hold any spelling.
    const rows = makeStore([{ id: "tx-legacy", txHash: "0x" + DIGEST.toUpperCase() }]);

    const res = await post({ paymentIntentId: "intent-2", txHash: "0x" + DIGEST });

    expect(res.status).toBe(409);
    expect(mocks.verifyTxOnChain).not.toHaveBeenCalled();
    expect(rows).toHaveLength(1);
  });

  it("stores and verifies the canonical form, so a later variant cannot slip past the unique index", async () => {
    const rows = makeStore();

    const res = await post({ paymentIntentId: "intent-1", txHash: "0x" + DIGEST.toUpperCase() });

    expect(res.status).toBe(200);
    expect(rows[0].txHash).toBe("0x" + DIGEST);
    expect(mocks.verifyTxOnChain).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: "0x" + DIGEST })
    );
  });

  it("does not treat a different hash as a duplicate", async () => {
    const rows = makeStore([{ id: "tx-old", txHash: "0x" + "1".repeat(64) }]);

    const res = await post({ paymentIntentId: "intent-2", txHash: "0x" + DIGEST });

    expect(res.status).toBe(200);
    expect(rows).toHaveLength(2);
  });
});

