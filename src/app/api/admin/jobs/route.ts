import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { securityLog } from "@/lib/security-log";
import { z } from "zod";
import { normalizeLocation } from "@/lib/location";
import { jobStatusSchema } from "@/lib/validation/job";

// ---------------------------------------------------------------------------
// ثابت‌ها
// ---------------------------------------------------------------------------

const DEFAULT_TAKE = 100;
const MAX_TAKE = 500;
const MIN_TAKE = 1;
const MAX_ID_LENGTH = 64;
const MAX_QUERY_LENGTH = 200;

// ---------------------------------------------------------------------------
// Schemaها
// ---------------------------------------------------------------------------

/** فیلدهایی که یک ادمین مجاز است روی یک job به‌روزرسانی کند. */
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

/** Query schema برای GET با coercion و کران‌ها. */
const listQuerySchema = z.object({
  take: z.coerce
    .number()
    .int()
    .min(MIN_TAKE)
    .max(MAX_TAKE)
    .catch(DEFAULT_TAKE),
  skip: z.coerce.number().int().min(0).catch(0),
  status: jobStatusSchema.optional(),
  q: z.string().trim().min(1).max(MAX_QUERY_LENGTH).optional(),
});

const jobIdSchema = z.string().min(1).max(MAX_ID_LENGTH);

// ---------------------------------------------------------------------------
// تایپ‌ها
// ---------------------------------------------------------------------------

type JsonErrorBody = { error: string; details?: unknown };

type PrismaLikeError = {
  code?: string;
  meta?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Helperها
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

/** فیلتر کردن fieldErrors zod به شکل قابل‌سریال‌سازی و امن. */
function flattenFieldErrors(
  error: z.ZodError
): Record<string, string[] | undefined> {
  return error.flatten().fieldErrors;
}

// ---------------------------------------------------------------------------
// گارد ادمین
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
        fieldErrors: flattenFieldErrors(parsedQuery.error),
      });
    }

    const { take, skip, status, q } = parsedQuery.data;

    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              {
                description: {
                  contains: q,
                  mode: "insensitive" as const,
                },
              },
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
      flattenFieldErrors(parsed.error)
    );
  }

  const { id, title, description, location, salary, type, status } =
    parsed.data;

  // ساخت payload تایپ‌دار از قبل
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
    // واکشی وضعیت قبلی (برای audit)
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

    // به‌روزرسانی اتمیک
    const job = await db.job.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    // Audit (best-effort structured log — بدون جدول AuditLog جداگانه)
    securityLog("admin.job_update", {
      actorId: guard.userId,
      targetId: id,
      meta: {
        companyId: previous.companyId ?? null,
        fields: Object.keys(updateData).join(","),
        beforeStatus: previous.status,
        afterStatus: updateData.status ?? previous.status,
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

  const idParsed = jobIdSchema.safeParse(searchParams.get("id") ?? undefined);
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

      securityLog("admin.job_delete", {
        actorId: guard.userId,
        targetId: id,
        meta: {
          companyId: existing.companyId ?? null,
          mode: "hard",
          previousStatus: existing.status,
        },
      });

      return NextResponse.json({ success: true, id, mode: "hard" });
    }

    // Soft-delete: علامت‌گذاری به‌عنوان archived
    const job = await db.job.update({
      where: { id },
      data: { status: "archived" },
      select: { id: true, status: true },
    });

    securityLog("admin.job_delete", {
      actorId: guard.userId,
      targetId: id,
      meta: {
        companyId: existing.companyId ?? null,
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
