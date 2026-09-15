import { describe, it, expect } from "vitest";
import {
  isPlausibleTxHash,
  verifyTxOnChain,
} from "./verify-crypto";

describe("isPlausibleTxHash", () => {
  it("accepts 64-hex BTC", () => {
    expect(
      isPlausibleTxHash(
        "BTC",
        "a".repeat(64)
      )
    ).toBe(true);
  });

  it("accepts 0x EVM hash", () => {
    expect(isPlausibleTxHash("ETH", "0x" + "ab".repeat(32))).toBe(true);
  });

  it("rejects short hash", () => {
    expect(isPlausibleTxHash("ETH", "0x123")).toBe(false);
  });
});

describe("verifyTxOnChain TON", () => {
  it("never invents success for TON", async () => {
    const r = await verifyTxOnChain({
      asset: "TON",
      txHash: "ton-hash-placeholder-long-enough",
    });
    expect(r.status).toBe("verification_unavailable");
    expect(r.found).toBe(false);
  });
});
