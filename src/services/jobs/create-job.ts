import { db } from "@/lib/db";
import { isAdminRole, isEmployerRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";
import { jobCreateSchema } from "@/lib/validation/job";
import { getEmployerActiveJobLimit } from "@/lib/plan-limits";
import type { z } from "zod";

export type CreateJobInput = z.infer<typeof jobCreateSchema>;

export type CreateJobResult =
  | {
      ok: true;
      job: Awaited<ReturnType<typeof persistJob>>;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      details?: unknown;
      limit?: number;
      used?: number;
    };

type Actor = {
  id: string;
  role?: string | null;
  email?: string | null;
  plan?: string | null;
};

async function persistJob(data: {
  title: string;
  description: string;
  location: string;
  type: string;
  remote: boolean;
  experience: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  tags: string[];
  deadline: Date | null;
  companyId: string | null;
  postedById: string;
}) {
  return db.job.create({
    data: {
      title: data.title,
      description: data.description,
      location: data.location,
      type: data.type,
      remote: data.remote,
      experience: data.experience,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      currency: data.currency,
      requirements: data.requirements,
      responsibilities: data.responsibilities,
      benefits: data.benefits,
      tags: data.tags,
      deadline: data.deadline,
      status: "active",
      companyId: data.companyId,
      postedById: data.postedById,
    },
    include: {
      company: { select: { id: true, name: true, logo: true, location: true } },
    },
  });
}

/**
 * Single entry point for creating jobs.
 * All API routes must call this — no duplicated create logic.
 */
export async function createJobForUser(
  actor: Actor,
  rawBody: unknown
): Promise<CreateJobResult> {
  if (!isEmployerRole(actor.role)) {
    return {
      ok: false,
      status: 403,
      error: "Only employers can post jobs",
    };
  }

  const parsed = jobCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Invalid input",
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // Fresh plan from DB (do not trust client)
  const user = await db.user.findUnique({
    where: { id: actor.id },
    select: { id: true, plan: true, email: true },
  });
  if (!user) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const maxJobs = getEmployerActiveJobLimit(user.plan);
  const activeJobs = await db.job.count({
    where: {
      status: "active",
      OR: [
        { postedById: user.id },
        { company: { ownerId: user.id } },
      ],
    },
  });

  if (activeJobs >= maxJobs) {
    return {
      ok: false,
      status: 403,
      error: `Active job limit reached (${maxJobs}). Upgrade your plan to post more jobs.`,
      code: "PLAN_LIMIT_JOBS",
      limit: maxJobs,
      used: activeJobs,
    };
  }

  let companyId: string | null = data.companyId ?? null;

  if (companyId) {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true, ownerId: true, status: true },
    });

    if (!company) {
      return { ok: false, status: 404, error: "Company not found" };
    }

    // Admins may attach to any company; employers only their own
    if (!isAdminRole(actor.role) && company.ownerId !== actor.id) {
      return {
        ok: false,
        status: 403,
        error: "You do not own this company",
      };
    }
  } else {
    const existing = await db.company.findFirst({
      where: { ownerId: actor.id },
      orderBy: { createdAt: "asc" },
    });

    if (existing) {
      companyId = existing.id;
    } else {
      const name = data.companyName?.trim() || "My Company";
      const created = await db.company.create({
        data: {
          name,
          ownerId: actor.id,
          email: user.email || actor.email || null,
          status: "active",
        },
      });
      companyId = created.id;
    }
  }

  const location = normalizeLocation(data.location) || data.location.trim();

  const job = await persistJob({
    title: data.title,
    description: data.description,
    location,
    type: data.type || "full-time",
    remote: Boolean(data.remote),
    experience: data.experience ?? null,
    salaryMin: data.salaryMin ?? null,
    salaryMax: data.salaryMax ?? null,
    currency: data.currency || "USD",
    requirements: data.requirements ?? [],
    responsibilities: data.responsibilities ?? [],
    benefits: data.benefits ?? [],
    tags: data.tags ?? [],
    deadline: data.deadline ? new Date(data.deadline) : null,
    companyId,
    postedById: actor.id,
  });

  return { ok: true, job };
}
