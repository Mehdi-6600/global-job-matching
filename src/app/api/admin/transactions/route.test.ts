import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Regression: a crypto payment can only be confirmed (and a plan activated)
// when on-chain verification succeeds against the stored recipient and the
// stored expected amount. Underpayments, missing stored data, replays and
// pending/unavailable chain states must never activate a subscription.
// No real funds or network calls: the verifier and database are mocked.

const mocks = vi.hoisted(() => ({
  verifyTxOnChain: vi.fn(),
  activatePlanForUser: vi.fn(),
  db: {
    transaction: { findUnique: vi.fn(), updateMany: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  prisma: {
    transaction: { updateMany: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireAdmin: vi.fn(async () => ({
    ok: true,
    user: { id: "admin-1", role: "ADMIN" },
  })),
}));
vi.mock("@/lib/ratelimit", () => ({
  adminRatelimit: { limit: vi.fn(async () => ({ success: true })) },
}));
vi.mock("@/lib/client-ip", () => ({ getRequestIp: () => "203.0.113.5" }));
vi.mock("@/lib/security-log", () => ({ securityLog: vi.fn() }));
vi.mock("@/lib/subscription", () => ({
  activatePlanForUser: mocks.activatePlanForUser,
}));
vi.mock("@/lib/payment/verify-crypto", () => ({
  verifyTxOnChain: mocks.verifyTxOnChain,
}));
vi.mock("@/lib/db", () => ({
  db: {
    transaction: mocks.db.transaction,
    notification: mocks.db.notification,
    $transaction: mocks.db.$transaction,
  },
}));

import { PATCH } from "@/app/api/admin/transactions/route";

const baseTx = {
  id: "tx-1",
  userId: "user-1",
  planId: "pro",
  type: "crypto",
  status: "pending",
  billingCycle: "monthly",
  txHash: "0x" + "a".repeat(64),
  cryptoType: "ETH",
  recipientAddress: "0xRecipient000000000000000000000000000001",
  expectedCryptoAmount: "0.5",
};

function patch(body: unknown) {
  return PATCH(
    new NextRequest("http://localhost/api/admin/transactions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

function expectNoActivation() {
  expect(mocks.activatePlanForUser).not.toHaveBeenCalled();
  expect(mocks.db.$transaction).not.toHaveBeenCalled();
  expect(mocks.prisma.transaction.updateMany).not.toHaveBeenCalled();
}

beforeEach(() => {
  mocks.db.transaction.findUnique.mockReset();
  mocks.db.transaction.updateMany.mockReset();
  mocks.db.notification.create.mockReset();
  mocks.db.notification.create.mockResolvedValue({});
  mocks.db.$transaction.mockReset();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(mocks.prisma)
  );
  mocks.prisma.transaction.updateMany.mockReset();
  mocks.prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.notification.create.mockReset();
  mocks.activatePlanForUser.mockReset();
  mocks.verifyTxOnChain.mockReset();
});

describe("admin crypto confirmation: no activation without verified payment", () => {
  it("rejects an underpaid transfer reported as failed by the verifier", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue(baseTx);
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "failed",
      found: true,
      note: "Amount mismatch: got 0.4, expected ~0.5",
      amountMatched: false,
    });

    const res = await patch({ id: "tx-1", status: "confirmed" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "TX_FAILED_ON_CHAIN" });
    expectNoActivation();
  });

  it("passes the stored recipient and expected amount to the verifier", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue(baseTx);
    mocks.verifyTxOnChain.mockResolvedValue({ status: "pending", found: true });

    await patch({ id: "tx-1", status: "confirmed" });

    expect(mocks.verifyTxOnChain).toHaveBeenCalledWith({
      asset: "ETH",
      txHash: baseTx.txHash,
      expectedRecipient: baseTx.recipientAddress,
      expectedCryptoAmount: 0.5,
    });
  });

  it("fails closed when the stored expected amount is missing (legacy row)", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue({
      ...baseTx,
      expectedCryptoAmount: null,
    });

    const res = await patch({ id: "tx-1", status: "confirmed" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "MISSING_CHAIN_DATA" });
    // Without an expected amount the verifier would skip the amount check.
    expect(mocks.verifyTxOnChain).not.toHaveBeenCalled();
    expectNoActivation();
  });

  it("fails closed when the stored recipient is missing", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue({
      ...baseTx,
      recipientAddress: null,
    });

    const res = await patch({ id: "tx-1", status: "confirmed" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "MISSING_CHAIN_DATA" });
    expect(mocks.verifyTxOnChain).not.toHaveBeenCalled();
    expectNoActivation();
  });

  it("fails closed when the stored expected amount is zero or negative", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue({
      ...baseTx,
      expectedCryptoAmount: "0",
    });

    const res = await patch({ id: "tx-1", status: "confirmed" });

    expect(res.status).toBe(400);
    expect(mocks.verifyTxOnChain).not.toHaveBeenCalled();
    expectNoActivation();
  });

  it("does not activate while the transaction is still pending on-chain", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue(baseTx);
    mocks.verifyTxOnChain.mockResolvedValue({ status: "pending", found: true });

    const res = await patch({ id: "tx-1", status: "confirmed" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "TX_PENDING" });
    expectNoActivation();
  });

  it("does not activate when verification is unavailable", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue(baseTx);
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "verification_unavailable",
      found: false,
    });

    const res = await patch({ id: "tx-1", status: "confirmed" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      code: "VERIFICATION_UNAVAILABLE",
    });
    expectNoActivation();
  });

  it("rejects a replayed confirmation of an already confirmed payment", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue({
      ...baseTx,
      status: "confirmed",
    });

    const res = await patch({ id: "tx-1", status: "confirmed" });

    expect(res.status).toBe(409);
    expect(mocks.verifyTxOnChain).not.toHaveBeenCalled();
    expectNoActivation();
  });

  it("activates exactly once when the verifier confirms the stored payment", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue(baseTx);
    mocks.verifyTxOnChain.mockResolvedValue({
      status: "confirmed",
      found: true,
      amountMatched: true,
      recipientMatched: true,
    });

    const res = await patch({ id: "tx-1", status: "confirmed" });

    expect(res.status).toBe(200);
    expect(mocks.prisma.transaction.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: "tx-1", status: "pending" },
      data: { status: "confirmed" },
    });
    expect(mocks.activatePlanForUser).toHaveBeenCalledTimes(1);
    expect(mocks.activatePlanForUser).toHaveBeenCalledWith(
      { userId: "user-1", planId: "pro", billingCycle: "monthly" },
      mocks.prisma
    );
  });

  it("rejecting does not verify on-chain nor activate", async () => {
    mocks.db.transaction.findUnique.mockResolvedValue(baseTx);
    mocks.db.transaction.updateMany.mockResolvedValue({ count: 1 });

    const res = await patch({ id: "tx-1", status: "rejected" });

    expect(res.status).toBe(200);
    expect(mocks.db.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: "tx-1", status: "pending" },
      data: { status: "rejected" },
    });
    expect(mocks.verifyTxOnChain).not.toHaveBeenCalled();
    expect(mocks.activatePlanForUser).not.toHaveBeenCalled();
  });
});
