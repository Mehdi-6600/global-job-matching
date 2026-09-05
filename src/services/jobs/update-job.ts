import type { Job } from "@prisma/client";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";
import { jobUpdateSchema } from "@/lib/validation/job";
import {
  assertCanCreateOrActivateJob,
  lockUserRow,
} from "@/services/jobs/active-job-limit";
import { ensureDefaultCompany } from "@/services/companies/ensure-default-company";
import { resolveEffectivePlan } from "@/lib/subscription";

export type UpdateJobResult =
  | { ok: true; job: Job }
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
};

/**
 * Single entry for job updates.
 * Enforces ownership, company ownership on companyId change,
 * and plan limits when reactivating.
 */
export async function updateJobForUser(
  actor: Actor,
  jobId: string,
  rawBody: unknown
): Promise<UpdateJobResult> {
  const existing = await db.job.findUnique({
    where: { id: jobId },
    include: {
      company: { select: { ownerId: true } },
    },
  });

  if (!existing) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const isAdmin = isAdminRole(actor.role);
  const isOwner = existing.company?.ownerId === actor.id;
  const isPoster = existing.postedById === actor.id;

  if (!isOwner && !isPoster && !isAdmin) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const parsed = jobUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Invalid input",
      details: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const job = await db.$transaction(async (tx) => {
      await lockUserRow(tx, actor.id);

      const data: Record<string, unknown> = { ...parsed.data };

      if (parsed.data.location !== undefined) {
        data.location =
          normalizeLocation(parsed.data.location) ||
          parsed.data.location.trim();
      }

      if (parsed.data.deadline !== undefined && parsed.data.deadline) {
        data.deadline = new Date(parsed.data.deadline);
      }

      // companyId change: must own the target company (or admin)
      if (parsed.data.companyId !== undefined) {
        if (parsed.data.companyId === null) {
          data.companyId = null;
        } else {
          const companyResult = await ensureDefaultCompany(tx, {
            ownerId: actor.id,
            companyId: parsed.data.companyId,
            isAdmin,
          });
          if (!companyResult.ok) {
            throw Object.assign(new Error(companyResult.error), {
              status: companyResult.status,
              payload: {
                ok: false as const,
                status: companyResult.status,
                error: companyResult.error,
              },
            });
          }
          data.companyId = companyResult.companyId;
        }
      }

      // categoryId optional existence check
      if (parsed.data.categoryId) {
        const cat = await tx.category.findUnique({
          where: { id: parsed.data.categoryId },
          select: { id: true },
        });
        if (!cat) {
          throw Object.assign(new Error("Category not found"), {
            status: 400,
            payload: {
              ok: false as const,
              status: 400,
              error: "Category not found",
            },
          });
        }
      }

      const becomingActive =
        data.status === "active" && existing.status !== "active";

      if (becomingActive && !isAdmin) {
        const ownerId =
          existing.company?.ownerId || existing.postedById || actor.id;

        const owner = await tx.user.findUnique({
          where: { id: ownerId },
          select: {
            plan: true,
            planExpiresAt: true,
          },
        });

        const { plan: effectivePlan } = resolveEffectivePlan({
          plan: owner?.plan ?? "free",
          planExpiresAt: owner?.planExpiresAt ?? null,
        });

        const limitError = await assertCanCreateOrActivateJob(tx, {
          userId: ownerId,
          plan: effectivePlan,
          excludeJobId: jobId,
        });

        if (limitError) {
          throw Object.assign(new Error(limitError.code), {
            status: 403,
            payload: {
              ok: false as const,
              status: 403,
              error: limitError.error,
              code: limitError.code,
              limit: limitError.limit,
              used: limitError.used,
            },
          });
        }
      }

      return tx.job.update({
        where: { id: jobId },
        data,
      });
    });

    return { ok: true, job };
  } catch (err: unknown) {
    const e = err as {
      status?: number;
      payload?: Extract<UpdateJobResult, { ok: false }>;
      message?: string;
    };

    if (e?.payload && e.payload.ok === false) {
      return e.payload;
    }

    if (e?.status === 403 || e?.status === 400 || e?.status === 404) {
      return {
        ok: false,
        status: e.status,
        error: e.message || "Forbidden",
      };
    }

    console.error("updateJobForUser error:", err);
    return { ok: false, status: 500, error: "Internal server error" };
  }
}

export async function deleteJobForUser(
  actor: Actor,
  jobId: string
): Promise<UpdateJobResult | { ok: true }> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { company: { select: { ownerId: true } } },
  });

  if (!job) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const isAdmin = isAdminRole(actor.role);
  const isOwner = job.company?.ownerId === actor.id;
  const isPoster = job.postedById === actor.id;

  if (!isOwner && !isPoster && !isAdmin) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  await db.job.delete({ where: { id: jobId } });
  return { ok: true };
}
