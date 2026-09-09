import { describe, it, expect } from "vitest";
import { jobIdSchema } from "./job-id";

describe("jobIdSchema", () => {
  it("accepts non-empty id", () => {
    const parsed = jobIdSchema.safeParse("job_abc123");
    expect(parsed.success).toBe(true);
  });

  it("rejects empty string", () => {
    const parsed = jobIdSchema.safeParse("");
    expect(parsed.success).toBe(false);
  });

  it("rejects whitespace-only", () => {
    const parsed = jobIdSchema.safeParse("   ");
    expect(parsed.success).toBe(false);
  });
});
