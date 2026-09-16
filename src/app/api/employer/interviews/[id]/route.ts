// employer-interviews-id-route.ts
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole, isEmployerRole } from "@/lib/roles";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";
import { interviewUpdateSchema } from "@/lib/validation/interview";

/**
 * PATCH /api/employer/interviews/[id]
 *
 * Updates an interview (status and/or notes) for the employer
 * who owns the related company, or for an admin.
 *
 * - Requires authentication
 * - Requires employer or admin role
 * - Rate limited per user + IP
 * - Validates request body with zod
 * - Ensures ownership before mutating
 * - Creates a notification when status changes
 * - Performs update + notification in a single transaction
 */
export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  // ---------------------------------------------------------------------------
  // 1. Authentication
  // ---------------------------------------------------------------------------
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Authorization (role-based)
  // ---------------------------------------------------------------------------
  if (!isEmployerRole(session.user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Rate limiting
  // ---------------------------------------------------------------------------
  const ip = getRequestIp(req);
  const limited = await ratelimit.limit(
    `employer_interview_patch_${session.user.id}_${ip}`
  );

  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  try {
    // -------------------------------------------------------------------------
    // 4. Validate route param
    // -------------------------------------------------------------------------
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // 5. Parse and validate request body
    // -------------------------------------------------------------------------
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

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

    // -------------------------------------------------------------------------
    // 6. Fetch interview with ownership-related relations
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // 7. Ownership / admin check
    // -------------------------------------------------------------------------
    const isOwner = interview.company?.ownerId === session.user.id;
    const isAdmin = isAdminRole(session.user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // -------------------------------------------------------------------------
    // 8. Extract validated fields
    // -------------------------------------------------------------------------
    const { status, notes } = parsed.data;

    const statusChanged =
      status !== undefined && status !== interview.status;

    // No-op guard: nothing to update
    if (status === undefined && notes === undefined) {
      return NextResponse.json(
        { error: "No changes requested" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // 9. Atomic update + notification
    // -------------------------------------------------------------------------
    const updated = await db.$transaction(async (tx) => {
      const updatedInterview = await tx.interview.update({
        where: { id },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(notes !== undefined ? { notes: notes || null } : {}),
        },
      });

      if (statusChanged) {
        await tx.notification.create({
          data: {
            userId: interview.userId,
            type: "interview",
            title: "Interview Updated",
            message: `Your interview for "${interview.job.title}" is now ${status}.`,
            actionUrl: "/my-interviews",
          },
        });
      }

      return updatedInterview;
    });

    // -------------------------------------------------------------------------
    // 10. Success response
    // -------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      interview: updated,
    });
  } catch (error: unknown) {
    // -------------------------------------------------------------------------
    // 11. Error handling
    // -------------------------------------------------------------------------
    const err = error as { code?: string };

    if (err.code === "P2025") {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    console.error("Update interview error:", error);

    return NextResponse.json(
      { error: "Failed to update interview" },
      { status: 500 }
    );
  }
}
