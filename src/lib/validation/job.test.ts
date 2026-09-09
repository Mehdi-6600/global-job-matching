import { describe, it, expect } from "vitest";
import { jobCreateSchema, jobUpdateSchema, jobStatusSchema } from "./job";

const validJob = {
  title: "Senior Frontend Developer",
  description:
    "We are hiring an experienced frontend engineer to build product UI with React and TypeScript.",
  location: "Berlin, Germany",
  type: "Full-time",
  remote: true,
  currency: "usd",
  salaryMin: 50000,
  salaryMax: 80000,
  requirements: ["React", "TypeScript"],
  tags: ["frontend"],
};

describe("jobCreateSchema", () => {
  it("accepts a valid job payload", () => {
    const parsed = jobCreateSchema.safeParse(validJob);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.currency).toBe("USD");
      expect(parsed.data.remote).toBe(true);
      expect(parsed.data.type).toBe("Full-time");
    }
  });

  it("rejects short title", () => {
    const parsed = jobCreateSchema.safeParse({
      ...validJob,
      title: "AB",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects short description", () => {
    const parsed = jobCreateSchema.safeParse({
      ...validJob,
      description: "Too short",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects salaryMin greater than salaryMax", () => {
    const parsed = jobCreateSchema.safeParse({
      ...validJob,
      salaryMin: 90000,
      salaryMax: 50000,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects past deadline", () => {
    const parsed = jobCreateSchema.safeParse({
      ...validJob,
      deadline: "2020-01-01",
    });
    expect(parsed.success).toBe(false);
  });

  it("coerces empty salary strings to null", () => {
    const parsed = jobCreateSchema.safeParse({
      ...validJob,
      salaryMin: "",
      salaryMax: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.salaryMin ?? null).toBeNull();
      expect(parsed.data.salaryMax ?? null).toBeNull();
    }
  });

  it("rejects unknown keys because schema is strict", () => {
    const parsed = jobCreateSchema.safeParse({
      ...validJob,
      hackerField: true,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("jobUpdateSchema", () => {
  it("accepts partial update", () => {
    const parsed = jobUpdateSchema.safeParse({
      title: "Updated title here",
      status: "closed",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("jobStatusSchema", () => {
  it("accepts known statuses", () => {
    expect(jobStatusSchema.safeParse("active").success).toBe(true);
    expect(jobStatusSchema.safeParse("draft").success).toBe(true);
  });

  it("rejects unknown status", () => {
    expect(jobStatusSchema.safeParse("published").success).toBe(false);
  });
});
