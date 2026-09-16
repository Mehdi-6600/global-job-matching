import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { z } from "zod";
import { normalizeLocation } from "@/lib/location";
import { jobStatusSchema } from "@/lib/validation/job";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TAKE = 100;
const MAX_TAKE = 500;
const MIN_TAKE = 1;
const MAX_ID_LENGTH = 64;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Fields an admin is allowed to update on a job. */
const adminJobUpdateSchema = z
  .object({
    id: z.string().min(1).max(MAX_ID_LENGTH),
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().min(20).max(20_000).optional(),
    location: z.string().trim().min(2).max(200).optional(),
    salary: z.string().trim().max(100).nullable().optional(),
    type: z.string().trim().min(1).max(50).optional(),
    status: jobStatusSchema.optional(),
  })
  .strict();

export type AdminJobUpdateInput = z.infer<typeof adminJobUpdateSchema>;

/** Query schema for GET with coercion and bounds. */
const listQuerySchema = z.object({
  take: z.coerce
    .number()
    .int()
    .min(MIN_TAKE)
    .max(MAX_TAKE)
    .catch(DEFAULT_TAKE),
  skip: z.coerce.number().int().min(0).catch(0),
  status: jobStatusSchema.optional(),
  q: z.string().trim().min(1).max(200).optional(),
});

const jobIdSchema = z.string().min(1).max(MAX_ID_LENGTH);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JsonErrorBody = { error: string; details?: unknown };

type PrismaLikeError = {
  code?: string;
  meta?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonError(
  error: string,
  status: number,
  details?: unknown
): NextResponse<JsonErrorBody> {
  return NextResponse.json(
    details !== undefined ? { error, details } : { error },
    { status }
  );
}

function isPrismaError(
  error: unknown,
  code?: string
): error is PrismaLikeError {
  if (typeof error !== "object" || error === null) return false;
  if (!("code" in error)) return false;
  const err = error as PrismaLikeError;
  return code === undefined || err.code === code;
}

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

type AdminGuard =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse<JsonErrorBody> };

async function requireAdmin(): Promise<AdminGuard> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: jsonError("Unauthorized", 401),
    };
  }

  if (!isAdminRole(session.user.role)) {
    return {
      ok: false,
      response: jsonError("Forbidden", 403),
    };
  }

  return {
    ok: true,
    userId: session.user.id,
    role: session.user.role,
  };
}

// ---------------------------------------------------------------------------
// Audit log (best-effort, non-blocking)
// ---------------------------------------------------------------------------

async function writeAuditLog(entry: {
  actorId: string;
  action: "UPDATE_JOB" | "DELETE_JOB" | "RESTORE_JOB";
  jobId: string;
  companyId?: string | null;
  changes?: Record<string, unknown>;
}): Promise<void> {
  try {
    // Adjust to your audit model; here we assume db.auditLog exists.
    // If it doesn't, this is a no-op and won't break the request.
    if (
      typeof (db as unknown as { auditLog?: { create?: unknown } }).auditLog
        ?.create !== "function"
    ) {
      console.info("[admin/jobs] audit", JSON.stringify(entry));
      return;
    }

    await (
      db as unknown as {
        auditLog: {
          create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
        };
      }
    ).auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: "Job",
        entityId: entry.jobId,
        companyId: entry.companyId ?? null,
        changes: entry.changes ?? {},
        createdAt: new Date(),
      },
    });
  } catch (err) {
    // Never let audit failure break the API
    console.error("[admin/jobs] audit log failed:", err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/jobs
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(req.url);

    const parsedQuery = listQuerySchema.safeParse({
      take: searchParams.get("take") ?? undefined,
      skip: searchParams.get("skip") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    if (!parsedQuery.success) {
      return jsonError("Invalid query parameters", 400, {
        fieldErrors: parsedQuery.error.flatten().fieldErrors,
      });
    }

    const { take, skip, status, q } = parsedQuery.data;

    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          company: { select: { id: true, name: true, slug: true } },
          postedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        total,
        take,
        skip,
        hasMore: skip + jobs.length < total,
      },
    });
  } catch (error) {
    console.error("[admin/jobs] GET error:", error);
    return jsonError("Failed to fetch jobs", 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/jobs
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  // Parse JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  // Validate
  const parsed = adminJobUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "Invalid input",
      400,
      parsed.error.flatten().fieldErrors
    );
  }

  const { id, title, description, location, salary, type, status } =
    parsed.data;

  // Build typed update payload up-front
  const updateData: Partial<{
    title: string;
    description: string;
    location: string;
    salary: string | null;
    type: string;
    status: z.infer<typeof jobStatusSchema>;
  }> = {};

  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (location !== undefined) {
    updateData.location = normalizeLocation(location) || location.trim();
  }
  if (salary !== undefined) updateData.salary = salary;
  if (type !== undefined) updateData.type = type;
  if (status !== undefined) updateData.status = status;

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update", 400);
  }

  try {
    // Fetch previous state (for audit)
    const previous = await db.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        companyId: true,
      },
    });

    if (!previous) {
      return jsonError("Job not found", 404);
    }

    // Atomic update
    const job = await db.job.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    // Audit (best-effort)
    void writeAuditLog({
      actorId: guard.userId,
      action: "UPDATE_JOB",
      jobId: id,
      companyId: previous.companyId,
      changes: {
        fields: Object.keys(updateData),
        before: {
          title: previous.title,
          status: previous.status,
        },
        after: {
          title: updateData.title ?? previous.title,
          status: updateData.status ?? previous.status,
        },
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return jsonError("Job not found", 404);
    }

    console.error("[admin/jobs] PATCH error:", error);
    return jsonError("Failed to update job", 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/jobs?id=...&hard=true
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);

  const idParsed = jobIdSchema.safeParse(searchParams.get("id"));
  if (!idParsed.success) {
    return jsonError("Invalid or missing job id", 400);
  }

  const id = idParsed.data;
  const hard = searchParams.get("hard") === "true";

  try {
    const existing = await db.job.findUnique({
      where: { id },
      select: { id: true, title: true, companyId: true, status: true },
    });

    if (!existing) {
      return jsonError("Job not found", 404);
    }

    if (hard) {
      await db.job.delete({ where: { id } });

      void writeAuditLog({
        actorId: guard.userId,
        action: "DELETE_JOB",
        jobId: id,
        companyId: existing.companyId,
        changes: { mode: "hard", previousStatus: existing.status },
      });

      return NextResponse.json({ success: true, id, mode: "hard" });
    }

    // Soft-delete: mark as archived
    const job = await db.job.update({
      where: { id },
      data: { status: "archived" },
      select: { id: true, status: true },
    });

    void writeAuditLog({
      actorId: guard.userId,
      action: "DELETE_JOB",
      jobId: id,
      companyId: existing.companyId,
      changes: {
        mode: "soft",
        previousStatus: existing.status,
        newStatus: job.status,
      },
    });

    return NextResponse.json({ success: true, id, mode: "soft", job });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return jsonError("Job not found", 404);
    }

    console.error("[admin/jobs] DELETE error:", error);
    return jsonError("Failed to delete job", 500);
  }
}
