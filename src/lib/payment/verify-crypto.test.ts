import { describe, it, expect } from "vitest";
import {
  isPlausibleTxHash,
  verifyTxOnChain,
} from "@/lib/payment/verify-crypto";

describe("isPlausibleTxHash", () => {
  it("accepts BTC 64-hex", () => {
    expect(
      isPlausibleTxHash("BTC", "a".repeat(64))
    ).toBe(true);
  });

  it("rejects short hashes", () => {
    expect(isPlausibleTxHash("BTC", "abc")).toBe(false);
  });

  it("accepts EVM 0x hash", () => {
    expect(isPlausibleTxHash("ETH", "0x" + "ab".repeat(32))).toBe(true);
  });
});

describe("verifyTxOnChain fail-closed", () => {
  it("invalid format → not_found", async () => {
    const r = await verifyTxOnChain({ asset: "BTC", txHash: "nope" });
    expect(r.status).toBe("not_found");
    expect(r.found).toBe(false);
  });

  it("TON without integration → verification_unavailable", async () => {
    const r = await verifyTxOnChain({
      asset: "TON",
      txHash: "abcdefghijklmnop",
    });
    expect(r.status).toBe("verification_unavailable");
  });
});
