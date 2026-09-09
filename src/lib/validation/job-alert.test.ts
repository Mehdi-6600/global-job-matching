import { describe, it, expect } from "vitest";
import {
  jobAlertCreateSchema,
  jobAlertDeleteSchema,
} from "./job-alert";

describe("jobAlertCreateSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(jobAlertCreateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts full alert preferences", () => {
    const parsed = jobAlertCreateSchema.safeParse({
      keywords: "react typescript",
      location: "Berlin",
      remote: true,
      type: "Full-time",
      minSalary: 60000,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects negative minSalary", () => {
    const parsed = jobAlertCreateSchema.safeParse({
      minSalary: -1,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const parsed = jobAlertCreateSchema.safeParse({
      keywords: "react",
      secret: true,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("jobAlertDeleteSchema", () => {
  it("accepts id", () => {
    expect(jobAlertDeleteSchema.safeParse({ id: "alert_1" }).success).toBe(
      true
    );
  });

  it("rejects empty id", () => {
    expect(jobAlertDeleteSchema.safeParse({ id: "  " }).success).toBe(false);
  });
});
