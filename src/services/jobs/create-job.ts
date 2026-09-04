import { db } from "@/lib/db";
import { isAdminRole, isEmployerRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";
import { jobCreateSchema } from "@/lib/validation/job";
import type { z } from "zod";
import {
  assertCanCreateOrActivateJob,
  lockUserRow,
} from "@/services/jobs/active-job-limit";
import { ensureDefaultCompany } from "@/services/companies/ensure-default-company";

export type CreateJobInput = z.infer<typeof jobCreateSchema>;

export type CreateJobResult =
  | {
      ok: true;
      job: {
        id: string;
        title: string;
        status: string;
        companyId: string | null;
        [key: string]: unknown;
      };
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

/**
 * Single entry point for creating jobs.
 * Plan limit + default company are enforced inside one DB transaction
 * with a row lock on the employer to prevent concurrent bypass.
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

  try {
    const job = await db.$transaction(async (tx) => {
      await lockUserRow(tx, actor.id);

      const user = await tx.user.findUnique({
        where: { id: actor.id },
        select: { id: true, plan: true, email: true },
      });

      if (!user) {
        throw Object.assign(new Error("USER_NOT_FOUND"), { status: 404 });
      }

      const limitError = await assertCanCreateOrActivateJob(tx, {
        userId: user.id,
        plan: user.plan,
      });

      if (limitError) {
        throw Object.assign(new Error(limitError.code), {
          status: limitError.status,
          payload: limitError,
        });
      }

      const companyResult = await ensureDefaultCompany(tx, {
        ownerId: actor.id,
        email: user.email || actor.email,
        preferredName: data.companyName,
        companyId: data.companyId ?? null,
        isAdmin: isAdminRole(actor.role),
      });

      if (!companyResult.ok) {
        throw Object.assign(new Error(companyResult.error), {
          status: companyResult.status,
          payload: companyResult,
        });
      }

      const location =
        normalizeLocation(data.location) || data.location.trim();

      return tx.job.create({
        data: {
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
          status: "active",
          companyId: companyResult.companyId,
          postedById: actor.id,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
              location: true,
            },
          },
        },
      });
    });

    return { ok: true, job };
  } catch (err: unknown) {
    const e = err as {
      status?: number;
      payload?: CreateJobResult & { ok: false };
      message?: string;
    };

    if (e?.payload && e.payload.ok === false) {
      return e.payload;
    }

    if (e?.status === 404) {
      return { ok: false, status: 404, error: "User not found" };
    }

    if (e?.status === 403 || e?.status === 400) {
      return {
        ok: false,
        status: e.status,
        error: e.message || "Forbidden",
      };
    }

    console.error("createJobForUser error:", err);
    return {
      ok: false,
      status: 500,
      error: "Internal server error",
    };
  }
}
