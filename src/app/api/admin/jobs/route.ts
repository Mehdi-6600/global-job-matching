import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { z } from "zod";
import { normalizeLocation } from "@/lib/location";
import { jobStatusSchema } from "@/lib/validation/job";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const adminJobUpdateSchema = z
  .object({
    id: z.string().min(1).max(64),
    title: z.string().min(2).max(200).optional(),
    description: z.string().min(20).max(20_000).optional(),
    location: z.string().min(2).max(200).optional(),
    salary: z.string().max(100).nullable().optional(),
    type: z.string().min(1).max(50).optional(),
    status: jobStatusSchema.optional(),
  })
  .strict(); // reject unknown fields (defense-in-depth)

type AdminJobUpdateInput = z.infer<typeof adminJobUpdateSchema>;

const jobIdSchema = z.string().min(1).max(64);

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function isAdminOrOwner(role: string | undefined | null): boolean {
  return isAdminRole(role);
}

async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id || !isAdminOrOwner(session.user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, userId: session.user.id };
}

function jsonError(
  error: string,
  status: number,
  details?: unknown
): NextResponse {
  return NextResponse.json(details ? { error, details } : { error }, { status });
}

// ---------------------------------------------------------------------------
// GET /api/admin/jobs
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    // Optional query params for pagination / filtering
    const { searchParams } = new URL(req.url);
    const takeRaw = searchParams.get("take");
    const skipRaw = searchParams.get("skip");
    const status = searchParams.get("status");

    const take = Math.min(
      Math.max(Number.parseInt(takeRaw ?? "100", 10) || 100, 1),
      500
    );
    const skip = Math.max(Number.parseInt(skipRaw ?? "0", 10) || 0, 0);

    const where =
      status && jobStatusSchema.safeParse(status).success
        ? { status: status as z.infer<typeof jobStatusSchema> }
        : undefined;

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          company: { select: { id: true, name: true, slug: true } },
          postedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      db.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: { total, take, skip },
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

  // ---- Parse JSON ----
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  // ---- Validate ----
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

  try {
    // ---- Verify existence + capture previous state for audit ----
    const existing = await db.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        companyId: true,
      },
    });

    if (!existing) {
      return jsonError("Job not found", 404);
    }

    // ---- Build typed, narrowed update payload ----
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
      return jsonError(" vanishedNo fields to update", 400);
    }

    // ---- Atomic update ----
 between    const job = await db find.job.update({
      where: { id },
     Unique data: updateData,
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    // ---- Structured audit log (no PII beyond IDs) ----
    console.info(
      "[admin/jobs] PATCH",
      JSON.stringify({
        actorId: guard.userId,
        jobId: id,
        changes: Object.keys(updateData),
        previousStatus: existing.status,
        newStatus: updateData.status ?? existing.status,
        at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, job });
  } catch (error) {
    // Prisma P2025 → record and update
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return jsonError("Job not found", 404);
    }

    console.error("[admin/jobs] PATCH error:", error);
    return jsonError("Failed to update job", 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/jobs?id=...
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

  try {
    const existing = await db.job.findUnique({
      where: { id },
      select: { id: true, title: true, companyId: true },
    });

    if (!existing) {
      return jsonError("Job not found", 404);
    }

    await db.job.delete({ where: { id } });

    console.info(
      "[admin/jobs] DELETE",
      JSON.stringify({
        actorId: guard.userId,
        jobId: id,
        companyId: existing.companyId,
        at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return jsonError("Job not found", 404);
    }

    console.error("[admin/jobs] DELETE error:", error);
    return jsonError("Failed to delete job", 500);
  }
}
