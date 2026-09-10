import { describe, it, expect } from "vitest";
import {
  APPLICATION_STATUSES,
  normalizeApplicationStatus,
  isApplicationStatus,
  applicationStatusLabel,
} from "./application-status";

describe("application-status", () => {
  it("exposes canonical statuses", () => {
    expect(APPLICATION_STATUSES).toContain("pending");
    expect(APPLICATION_STATUSES).toContain("hired");
  });

  it("normalizes aliases", () => {
    expect(normalizeApplicationStatus("applied")).toBe("pending");
    expect(normalizeApplicationStatus("shortlisted")).toBe("viewed");
    expect(normalizeApplicationStatus("INTERVIEW")).toBe("interview");
    expect(normalizeApplicationStatus("  Hired ")).toBe("hired");
  });

  it("returns null for unknown values", () => {
    expect(normalizeApplicationStatus("accepted")).toBeNull();
    expect(normalizeApplicationStatus(123)).toBeNull();
    expect(normalizeApplicationStatus(null)).toBeNull();
  });

  it("isApplicationStatus checks canonical values only", () => {
    expect(isApplicationStatus("pending")).toBe(true);
    expect(isApplicationStatus("applied")).toBe(false);
  });

  it("applicationStatusLabel returns human labels", () => {
    expect(applicationStatusLabel("pending")).toBe("Pending");
    expect(applicationStatusLabel("applied")).toBe("Pending");
    expect(applicationStatusLabel("interview")).toBe("Interview");
  });
});
