import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Regression: applicant PII (name, email, profile) must be visible only to the
// company owner or an admin, never to a poster who no longer owns the company.

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));

const dbMock = vi.hoisted(() => ({
  job: { findUnique: vi.fn() },
  application: { findMany: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({ auth: authMock.auth }));
vi.mock("@/lib/db", () => ({ db: dbMock }));

import { GET } from "@/app/api/jobs/[id]/applicants/route";
import { ROLES } from "@/lib/roles";

const req = new NextRequest("http://localhost/api/jobs/job-1/applicants");
const ctx = { params: Promise.resolve({ id: "job-1" }) };

const applicantRow = {
  id: "app-1",
  status: "applied",
  user: {
    id: "seeker-1",
    name: "Jane Seeker",
    email: "jane@example.com",
    image: null,
    profile: null,
  },
};

function signIn(id: string, role: string) {
  authMock.auth.mockResolvedValue({ user: { id, role } });
}

beforeEach(() => {
  dbMock.job.findUnique.mockReset();
  dbMock.application.findMany.mockReset();
  dbMock.application.findMany.mockResolvedValue([applicantRow]);
  dbMock.job.findUnique.mockResolvedValue({
    id: "job-1",
    title: "Engineer",
    postedById: "employer-a",
    company: { id: "company-a", name: "Acme", ownerId: "employer-b" },
  });
});

describe("GET /api/jobs/[id]/applicants: applicant PII access", () => {
  it("denies the original poster when the company is owned by someone else", async () => {
    signIn("employer-a", ROLES.EMPLOYER);
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
    expect(dbMock.application.findMany).not.toHaveBeenCalled();
    expect(await res.text()).not.toContain("jane@example.com");
  });

  it("allows the company owner", async () => {
    signIn("employer-b", ROLES.EMPLOYER);
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    expect(dbMock.application.findMany).toHaveBeenCalledTimes(1);
  });

  it("allows an admin", async () => {
    signIn("admin-1", ROLES.ADMIN);
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
  });

  it("denies a job seeker even if they are the company owner", async () => {
    dbMock.job.findUnique.mockResolvedValue({
      id: "job-1",
      title: "Engineer",
      postedById: "seeker-x",
      company: { id: "company-a", name: "Acme", ownerId: "seeker-x" },
    });
    signIn("seeker-x", ROLES.JOB_SEEKER);
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
    expect(dbMock.application.findMany).not.toHaveBeenCalled();
  });
});
