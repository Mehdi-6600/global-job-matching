import { describe, it, expect } from "vitest";
import {
  isPlausibleTxHash,
  verifyTxOnChain,
} from "./verify-crypto";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_EVM_HASH = "0x" + "ab".repeat(32);
const VALID_EVM_RECIPIENT = "0x" + "11".repeat(20);

// ---------------------------------------------------------------------------
// isPlausibleTxHash
// ---------------------------------------------------------------------------

describe("isPlausibleTxHash", () => {
  it.each([
    ["BTC", "a".repeat(64)],
    ["DOGE", "b".repeat(64)],
    ["btc", "c".repeat(64)],
    ["doge", "d".repeat(64)],
  ])("accepts 64-hex hash for %s", (asset, hash) => {
    expect(isPlausibleTxHash(asset, hash)).toBe(true);
  });

  it.each([
    ["ETH", "0x" + "ab".repeat(32)],
    ["BNB", "0x" + "cd".repeat(32)],
    ["eth", "0x" + "ef".repeat(32)],
    ["bnb", "0x" + "12".repeat(32)],
  ])("accepts 0x-prefixed EVM hash for %s", (asset, hash) => {
    expect(isPlausibleTxHash(asset, hash)).toBe(true);
  });

  it.each([
    ["ETH", "0x123"],
    ["ETH", "0x"],
    ["ETH", ""],
    ["BTC", ""],
    ["BTC", "a".repeat(63)],
    ["BTC", "a".repeat(65)],
    ["BTC", "z".repeat(64)],
    ["ETH", "0x" + "zz".repeat(32)],
  ])("rejects invalid hash %j for %s", (asset, hash) => {
    expect(isPlausibleTxHash(asset, hash)).toBe(false);
  });

  it("rejects unknown asset regardless of hash shape", () => {
    expect(isPlausibleTxHash("XYZCOIN", "a".repeat(64))).toBe(false);
    expect(isPlausibleTxHash("XYZCOIN", VALID_EVM_HASH)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verifyTxOnChain (fail-closed)
// ---------------------------------------------------------------------------

describe("verifyTxOnChain fail-closed", () => {
  it("never invents success for TON", async () => {
    const r = await verifyTxOnChain({
      asset: "TON",
      txHash: "ton-hash-placeholder-long-enough",
    });
    expect(r.status).toBe("verification_unavailable");
    expect(r.found).toBe(false);
  });

  it("rejects invalid hash format without calling explorers as success", async () => {
    const r = await verifyTxOnChain({
      asset: "ETH",
      txHash: "nope",
      expectedRecipient: VALID_EVM_RECIPIENT,
      expectedCryptoAmount: 1,
    });
    expect(r.status).toBe("not_found");
    expect(r.found).toBe(false);
  });

  it("rejects unknown asset as unavailable", async () => {
    const r = await verifyTxOnChain({
      asset: "XYZCOIN",
      txHash: "a".repeat(64),
    });
    expect(r.status).toBe("verification_unavailable");
    expect(r.found).toBe(false);
  });

  it("never reports found=true for an empty hash", async () => {
    const r = await verifyTxOnChain({
      asset: "BTC",
      txHash: "",
    });
    expect(r.found).toBe(false);
  });

  it("never reports found=true when recipient is malformed", async () => {
    const r = await verifyTxOnChain({
      asset: "ETH",
      txHash: VALID_EVM_HASH,
      expectedRecipient: "not-an-address",
      expectedCryptoAmount: 1,
    });
    expect(r.found).toBe(false);
  });

  it("is stable across repeated calls for the same unavailable asset", async () => {
    const first = await verifyTxOnChain({
      asset: "TON",
      txHash: "ton-hash-placeholder-long-enough",
    });
    const second = await verifyTxOnChain({
      asset: "TON",
      txHash: "ton-hash-placeholder-long-enough",
    });
    expect(first.status).toBe(second.status);
    expect(first.found).toBe(false);
    expect(second.found).toBe(false);
  });

  it("never throws on malformed input", async () => {
    await expect(
      verifyTxOnChain({ asset: "ETH", txHash: "" }),
    ).resolves.toBeDefined();
  });
});
