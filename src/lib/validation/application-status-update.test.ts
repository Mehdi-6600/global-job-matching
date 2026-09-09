import { describe, it, expect } from "vitest";
import { applicationStatusUpdateSchema } from "./application-status-update";

describe("applicationStatusUpdateSchema", () => {
  it("accepts a status string", () => {
    expect(
      applicationStatusUpdateSchema.safeParse({ status: "interview" }).success
    ).toBe(true);
  });

  it("rejects empty status", () => {
    expect(
      applicationStatusUpdateSchema.safeParse({ status: "  " }).success
    ).toBe(false);
  });

  it("rejects missing status", () => {
    expect(applicationStatusUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      applicationStatusUpdateSchema.safeParse({
        status: "hired",
        note: "ok",
      }).success
    ).toBe(false);
  });
});
