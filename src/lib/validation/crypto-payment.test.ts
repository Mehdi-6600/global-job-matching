import { describe, it, expect } from "vitest";
import { cryptoPaymentSchema } from "./crypto-payment";

describe("cryptoPaymentSchema", () => {
  it("accepts valid payment submission", () => {
    const parsed = cryptoPaymentSchema.safeParse({
      planId: "pro",
      txHash: "0xabcdef1234567890",
      cryptoType: "USDT",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects free planId", () => {
    const parsed = cryptoPaymentSchema.safeParse({
      planId: "free",
      txHash: "0xabcdef1234567890",
      cryptoType: "USDT",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects short txHash", () => {
    const parsed = cryptoPaymentSchema.safeParse({
      planId: "business",
      txHash: "abc",
      cryptoType: "BTC",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown crypto type", () => {
    const parsed = cryptoPaymentSchema.safeParse({
      planId: "enterprise",
      txHash: "0xabcdef1234567890",
      cryptoType: "XRP",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const parsed = cryptoPaymentSchema.safeParse({
      planId: "pro",
      txHash: "0xabcdef1234567890",
      cryptoType: "ETH",
      walletSecret: "nope",
    });
    expect(parsed.success).toBe(false);
  });
});
