import { describe, it, expect } from "vitest";
import { paymentSchema } from "./payment";

describe("paymentSchema", () => {
  it("accepts known plan ids including free", () => {
    for (const planId of ["free", "pro", "business", "enterprise"]) {
      expect(paymentSchema.safeParse({ planId }).success).toBe(true);
    }
  });

  it("rejects unknown plan", () => {
    expect(paymentSchema.safeParse({ planId: "gold" }).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      paymentSchema.safeParse({ planId: "pro", amount: 9 }).success
    ).toBe(false);
  });
});
