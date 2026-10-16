import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks: keep the authorization gate under test and avoid any real DB access.
// ---------------------------------------------------------------------------

const dbMock = vi.hoisted(() => ({
  job: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}));

const txMock = vi.hoisted(() => ({
  job: { update: vi.fn() },
  category: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

vi.mock("@/lib/db-transaction", () => ({
  withTransaction: async (fn: (tx: unknown) => unknown) => fn(txMock),
}));

vi.mock("@/services/jobs/active-job-limit", () => ({
  assertCanCreateOrActivateJob: vi.fn(async () => null),
  lockUserRow: vi.fn(async () => undefined),
}));

vi.mock("@/services/companies/ensure-default-company", () => ({
  ensureDefaultCompany: vi.fn(async () => ({
    ok: true,
    companyId: "company-a",
  })),
}));

vi.mock("@/lib/subscription", () => ({
  resolveEffectivePlan: vi.fn(() => ({ plan: "free" })),
}));

import { deleteJobForUser, updateJobForUser } from "@/services/jobs/update-job";
import { ROLES } from "@/lib/roles";

// A job attached to company-a, owned by employer-a, posted by employer-a.
const ownedJob = {
  id: "job-1",
  status: "draft",
  postedById: "employer-a",
  company: { ownerId: "employer-a" },
};

// A company-less job that was originally posted by employer-a.
const orphanJob = {
  id: "job-1",
  status: "draft",
  postedById: "employer-a",
  company: null,
};

// A job whose company is now owned by employer-b, still posted by employer-a.
const transferredJob = {
  id: "job-1",
  status: "draft",
  postedById: "employer-a",
  company: { ownerId: "employer-b" },
};

const validBody = { title: "Senior Engineer" };

beforeEach(() => {
  dbMock.job.findUnique.mockReset();
  dbMock.job.delete.mockReset();
  txMock.job.update.mockReset();
  txMock.job.update.mockImplementation(async ({ data }) => ({
    id: "job-1",
    ...data,
  }));
});

describe("updateJobForUser: authorization gate", () => {
  it("allows the company owner to update their job", async () => {
    dbMock.job.findUnique.mockResolvedValue(ownedJob);
    const result = await updateJobForUser(
      { id: "employer-a", role: ROLES.EMPLOYER },
      "job-1",
      validBody
    );
    expect(result.ok).toBe(true);
    expect(txMock.job.update).toHaveBeenCalledTimes(1);
  });

  it("allows an admin to update a company-less job", async () => {
    dbMock.job.findUnique.mockResolvedValue(orphanJob);
    const result = await updateJobForUser(
      { id: "admin-1", role: ROLES.ADMIN },
      "job-1",
      validBody
    );
    expect(result.ok).toBe(true);
  });

  it("denies the original poster of a company-less job", async () => {
    dbMock.job.findUnique.mockResolvedValue(orphanJob);
    const result = await updateJobForUser(
      { id: "employer-a", role: ROLES.EMPLOYER },
      "job-1",
      validBody
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(txMock.job.update).not.toHaveBeenCalled();
  });

  it("denies the poster after the company moved to another owner", async () => {
    dbMock.job.findUnique.mockResolvedValue(transferredJob);
    const result = await updateJobForUser(
      { id: "employer-a", role: ROLES.EMPLOYER },
      "job-1",
      validBody
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(txMock.job.update).not.toHaveBeenCalled();
  });

  it("denies a non-admin who tries to detach the job from its company", async () => {
    dbMock.job.findUnique.mockResolvedValue(ownedJob);
    const result = await updateJobForUser(
      { id: "employer-a", role: ROLES.EMPLOYER },
      "job-1",
      { companyId: null }
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(txMock.job.update).not.toHaveBeenCalled();
  });

  it("allows an admin to detach a job from its company", async () => {
    dbMock.job.findUnique.mockResolvedValue(ownedJob);
    const result = await updateJobForUser(
      { id: "admin-1", role: ROLES.ADMIN },
      "job-1",
      { companyId: null }
    );
    expect(result.ok).toBe(true);
    expect(txMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: null }),
      })
    );
  });

  it("denies unknown roles even on an owned job", async () => {
    dbMock.job.findUnique.mockResolvedValue(ownedJob);
    const result = await updateJobForUser(
      { id: "employer-a", role: "root" },
      "job-1",
      validBody
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("returns 404 for a missing job before any authorization", async () => {
    dbMock.job.findUnique.mockResolvedValue(null);
    const result = await updateJobForUser(
      { id: "employer-a", role: ROLES.EMPLOYER },
      "job-x",
      validBody
    );
    expect(result).toMatchObject({ ok: false, status: 404 });
  });
});

describe("deleteJobForUser: authorization gate", () => {
  it("allows the company owner to delete the job", async () => {
    dbMock.job.findUnique.mockResolvedValue(ownedJob);
    const result = await deleteJobForUser(
      { id: "employer-a", role: ROLES.EMPLOYER },
      "job-1"
    );
    expect(result).toEqual({ ok: true });
    expect(dbMock.job.delete).toHaveBeenCalledWith({ where: { id: "job-1" } });
  });

  it("denies the original poster of a company-less job", async () => {
    dbMock.job.findUnique.mockResolvedValue(orphanJob);
    const result = await deleteJobForUser(
      { id: "employer-a", role: ROLES.EMPLOYER },
      "job-1"
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(dbMock.job.delete).not.toHaveBeenCalled();
  });

  it("denies the poster after the company moved to another owner", async () => {
    dbMock.job.findUnique.mockResolvedValue(transferredJob);
    const result = await deleteJobForUser(
      { id: "employer-a", role: ROLES.EMPLOYER },
      "job-1"
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(dbMock.job.delete).not.toHaveBeenCalled();
  });

  it("allows an admin to delete a company-less job", async () => {
    dbMock.job.findUnique.mockResolvedValue(orphanJob);
    const result = await deleteJobForUser(
      { id: "admin-1", role: ROLES.ADMIN },
      "job-1"
    );
    expect(result).toEqual({ ok: true });
  });
});
