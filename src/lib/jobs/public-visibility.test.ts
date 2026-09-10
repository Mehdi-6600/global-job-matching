import { describe, it, expect } from "vitest";
import {
  isPublicJobStatus,
  canViewJobDetail,
} from "./public-visibility";

describe("isPublicJobStatus", () => {
  it("allows active only", () => {
    expect(isPublicJobStatus("active")).toBe(true);
    expect(isPublicJobStatus("draft")).toBe(false);
    expect(isPublicJobStatus("closed")).toBe(false);
    expect(isPublicJobStatus("paused")).toBe(false);
    expect(isPublicJobStatus(null)).toBe(false);
  });
});

describe("canViewJobDetail", () => {
  it("public can only see active", () => {
    expect(
      canViewJobDetail({
        jobStatus: "active",
        viewerId: null,
        viewerRole: null,
      })
    ).toBe(true);

    expect(
      canViewJobDetail({
        jobStatus: "draft",
        viewerId: null,
        viewerRole: null,
      })
    ).toBe(false);
  });

  it("poster can see draft", () => {
    expect(
      canViewJobDetail({
        jobStatus: "draft",
        postedById: "u1",
        viewerId: "u1",
        viewerRole: "EMPLOYER",
      })
    ).toBe(true);
  });

  it("company owner can see closed", () => {
    expect(
      canViewJobDetail({
        jobStatus: "closed",
        companyOwnerId: "o1",
        viewerId: "o1",
        viewerRole: "EMPLOYER",
      })
    ).toBe(true);
  });

  it("admin can see any status", () => {
    expect(
      canViewJobDetail({
        jobStatus: "draft",
        viewerId: "a1",
        viewerRole: "ADMIN",
      })
    ).toBe(true);
  });

  it("unrelated user cannot see draft", () => {
    expect(
      canViewJobDetail({
        jobStatus: "draft",
        postedById: "u1",
        companyOwnerId: "o1",
        viewerId: "stranger",
        viewerRole: "JOB_SEEKER",
      })
    ).toBe(false);
  });
});
