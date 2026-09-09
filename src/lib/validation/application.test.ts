import { describe, it, expect } from "vitest";
import {
  applicationCreateSchema,
  applicationUpdateSchema,
} from "./application";

describe("applicationCreateSchema", () => {
  it("accepts jobId only", () => {
    const parsed = applicationCreateSchema.safeParse({
      jobId: "job_123",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts optional cover letter", () => {
    const parsed = applicationCreateSchema.safeParse({
      jobId: "job_123",
      coverLetter: "I am interested in this role.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing jobId", () => {
    const parsed = applicationCreateSchema.safeParse({
      coverLetter: "Hello",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty jobId", () => {
    const parsed = applicationCreateSchema.safeParse({
      jobId: "   ",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const parsed = applicationCreateSchema.safeParse({
      jobId: "job_123",
      extra: true,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("applicationUpdateSchema", () => {
  it("accepts valid statuses", () => {
    for (const status of [
      "pending",
      "viewed",
      "interview",
      "rejected",
      "hired",
    ]) {
      expect(applicationUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(
      applicationUpdateSchema.safeParse({ status: "accepted" }).success
    ).toBe(false);
  });
});
