import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isAdminRole,
  isEmployerRole,
} from "@/lib/roles";
import {
  interviewUpdateSchema,
} from "@/lib/validation/interview";

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!isEmployerRole(session.user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Interview ID is required",
        },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    const parsed =
      interviewUpdateSchema.safeParse(
        body
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details:
            parsed.error.flatten()
              .fieldErrors,
        },
        { status: 400 }
      );
    }

    const interview =
      await db.interview.findUnique({
        where: {
          id,
        },

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
        {
          error: "Interview not found",
        },
        { status: 404 }
      );
    }

    const isOwner =
      interview.company?.ownerId ===
      session.user.id;

    const isAdmin =
      isAdminRole(
        session.user.role
      );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const {
      status,
      notes,
    } = parsed.data;

    const statusChanged =
      status !== undefined &&
      status !== interview.status;

    /*
     * No unnecessary database operation.
     */
    if (
      status === undefined &&
      notes === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "No changes requested",
        },
        { status: 400 }
      );
    }

    /*
     * Update interview and notification
     * atomically.
     */
    const updated =
      await db.$transaction(
        async (tx) => {
          const updatedInterview =
            await tx.interview.update({
              where: {
                id,
              },

              data: {
                ...(status !== undefined
                  ? {
                      status,
                    }
                  : {}),

                ...(notes !== undefined
                  ? {
                      notes:
                        notes || null,
                    }
                  : {}),
              },
            });

          if (statusChanged) {
            await tx.notification.create({
              data: {
                userId:
                  interview.userId,

                type:
                  "interview",

                title:
                  "Interview Updated",

                message:
                  `Your interview for "${interview.job.title}" is now ${status}.`,

                actionUrl:
                  "/my-interviews",
              },
            });
          }

          return updatedInterview;
        }
      );

    return NextResponse.json({
      success: true,
      interview: updated,
    });
  } catch (error: unknown) {
    const err =
      error as {
        code?: string;
      };

    if (err.code === "P2025") {
      return NextResponse.json(
        {
          error:
            "Interview not found",
        },
        { status: 404 }
      );
    }

    console.error(
      "Update interview error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update interview",
      },
      { status: 500 }
    );
  }
}
