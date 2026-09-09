import { describe, it, expect } from "vitest";
import {
  interviewCreateSchema,
  interviewUpdateSchema,
  interviewStatusSchema,
} from "./interview";

describe("interviewCreateSchema", () => {
  it("accepts a valid interview payload", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const parsed = interviewCreateSchema.safeParse({
      jobId: "job_1",
      userId: "user_1",
      scheduledAt: future,
      duration: 45,
      type: "video",
      notes: "Prepare portfolio",
      meetLink: "https://meet.example.com/abc",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.duration).toBe(45);
    }
  });

  it("applies default duration and type", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const parsed = interviewCreateSchema.safeParse({
      jobId: "job_1",
      userId: "user_1",
      scheduledAt: future,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.duration).toBe(30);
      expect(parsed.data.type).toBe("video");
    }
  });

  it("rejects duration below minimum", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const parsed = interviewCreateSchema.safeParse({
      jobId: "job_1",
      userId: "user_1",
      scheduledAt: future,
      duration: 5,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid meet link", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const parsed = interviewCreateSchema.safeParse({
      jobId: "job_1",
      userId: "user_1",
      scheduledAt: future,
      meetLink: "not-a-url",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("interviewUpdateSchema", () => {
  it("accepts status-only update", () => {
    expect(
      interviewUpdateSchema.safeParse({ status: "completed" }).success
    ).toBe(true);
  });

  it("rejects empty update object", () => {
    expect(interviewUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("interviewStatusSchema", () => {
  it("accepts known statuses", () => {
    for (const status of ["scheduled", "completed", "cancelled", "no_show"]) {
      expect(interviewStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects unknown status", () => {
    expect(interviewStatusSchema.safeParse("pending").success).toBe(false);
  });
});
