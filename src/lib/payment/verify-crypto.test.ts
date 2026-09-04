import { describe, it, expect } from "vitest";
import { isPlausibleTxHash } from "./verify-crypto";

describe("isPlausibleTxHash", () => {
  it("accepts 64-hex BTC", () => {
    expect(isPlausibleTxHash("BTC", "a".repeat(64))).toBe(true);
  });

  it("rejects short hash", () => {
    expect(isPlausibleTxHash("BTC", "abc")).toBe(false);
  });

  it("accepts EVM 0x hash", () => {
    expect(isPlausibleTxHash("ETH", "0x" + "ab".repeat(32))).toBe(true);
  });

  it("rejects invalid chars", () => {
    expect(isPlausibleTxHash("ETH", "0xZZ" + "a".repeat(62))).toBe(false);
  });
});
