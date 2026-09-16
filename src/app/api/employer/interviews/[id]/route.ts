import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole, isEmployerRole } from "@/lib/roles";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";
import { interviewUpdateSchema } from "@/lib/validation/interview";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";

// ---------------------------------------------------------------------------
// PATCH /api/employer/interviews/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  // -------------------------------------------------------------------------
  // 1) Auth
  // -------------------------------------------------------------------------
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmployerRole(session.user.role) && !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // -------------------------------------------------------------------------
  // 2) Rate limit
  // -------------------------------------------------------------------------
  const ip = getRequestIp(req);
  const limited = await ratelimit.limit(
    `employer_interview_patch_${session.user.id}_${ip}`
  );
  if (!limited.success) {
    return rateLimitedResponse(limited, "Too many requests");
  }

  try {
    // -----------------------------------------------------------------------
    // 3) Resolve route param
    // -----------------------------------------------------------------------
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 4) Parse JSON body
    // -----------------------------------------------------------------------
    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 5) Validate input
    // -----------------------------------------------------------------------
    const parsed = interviewUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 6) Load interview + ownership context
    // -----------------------------------------------------------------------
    const interview = await db.interview.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        companyId: true,
        jobId: true,
        status: true,
        job: {
          select: {
            title: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // -----------------------------------------------------------------------
    // 7) Ownership / admin guard (IDOR protection)
    // -----------------------------------------------------------------------
    const isOwner = interview.company?.ownerId === session.user.id;
    const isAdmin = isAdminRole(session.user.role);

    if (!isOwner && !isAdmin) {
      // عمداً 404 برمی‌گردانیم تا وجود منبع لو نرود
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // -----------------------------------------------------------------------
    // 8) Extract update fields
    // -----------------------------------------------------------------------
    const { status, notes } = parsed.data;

    const statusChanged =
      status !== undefined && status !== interview.status;

    // No-op guard: بدون فیلد معتبر، عملیات دیتابیس انجام نده
    if (status === undefined && notes === undefined) {
      return NextResponse.json(
        { error: "No changes requested" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 9) Atomic: update interview + notify candidate (if status changed)
    // -----------------------------------------------------------------------
    const updated = await db.$transaction(async (tx) => {
      const updatedInterview = await tx.interview.update({
        where: { id },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(notes !== undefined ? { notes: notes || null } : {}),
        },
      });

      if (statusChanged) {
        // job.title ممکن است به‌خاطر FK موجود باشد، اما برای safety چک می‌کنیم
        const jobTitle = interview.job?.title ?? "the position";

        await tx.notification.create({
          data: {
            userId: interview.userId,
            type: "interview",
            title: "Interview Updated",
            message: `Your interview for "${jobTitle}" is now ${status}.`,
            actionUrl: "/my-interviews",
          },
        });
      }

      return updatedInterview;
    });

    // -----------------------------------------------------------------------
    // 10) Success
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      interview: updated,
    });
  } catch (error: unknown) {
    const err = error as { code?: string };

    if (err.code === "P2025") {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    console.error("[employer/interviews/:id] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update interview" },
      { status: 500 }
    );
  }
}
