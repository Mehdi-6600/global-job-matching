import { describe, it, expect } from "vitest";
import { isPlausibleTxHash } from "./verify-crypto";

const HEX64 = "a".repeat(64);
const EVM = `0x${HEX64}`;

describe("isPlausibleTxHash", () => {
  it("accepts 64-hex for BTC/DOGE", () => {
    expect(isPlausibleTxHash("BTC", HEX64)).toBe(true);
    expect(isPlausibleTxHash("DOGE", HEX64)).toBe(true);
  });

  it("rejects short BTC hash", () => {
    expect(isPlausibleTxHash("BTC", "abcdef")).toBe(false);
  });

  it("accepts EVM style hashes", () => {
    expect(isPlausibleTxHash("ETH", EVM)).toBe(true);
    expect(isPlausibleTxHash("USDT", HEX64)).toBe(true);
    expect(isPlausibleTxHash("BNB", EVM)).toBe(true);
  });

  it("rejects invalid characters", () => {
    expect(isPlausibleTxHash("ETH", "0xzzzz")).toBe(false);
  });

  it("is lenient for TON", () => {
    expect(isPlausibleTxHash("TON", "abcde12345_ok")).toBe(true);
  });
});
