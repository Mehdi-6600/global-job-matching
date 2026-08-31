import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { normalizeApplicationStatus } from "@/lib/application-status";
import {
  applicationUpdateSchema,
} from "@/lib/validation/application";

export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Application ID is required",
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
      applicationUpdateSchema.safeParse(
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

    const normalizedStatus =
      normalizeApplicationStatus(
        parsed.data.status
      );

    if (!normalizedStatus) {
      return NextResponse.json(
        {
          error: "Invalid status",
        },
        { status: 400 }
      );
    }

    const application =
      await db.application.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          job: {
            select: {
              id: true,
              title: true,
              postedById: true,
              company: {
                select: {
                  ownerId: true,
                  name: true,
                },
              },
            },
          },
        },
      });

    if (!application) {
      return NextResponse.json(
        {
          error:
            "Application not found",
        },
        { status: 404 }
      );
    }

    const isCompanyOwner =
      application.job.company
        ?.ownerId ===
      session.user.id;

    const isPoster =
      application.job.postedById ===
      session.user.id;

    const isAdmin =
      isAdminRole(
        session.user.role
      );

    if (
      !isCompanyOwner &&
      !isPoster &&
      !isAdmin
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /*
     * Avoid unnecessary database writes
     * and duplicate notifications.
     */
    if (
      normalizeApplicationStatus(
        application.status
      ) === normalizedStatus
    ) {
      return NextResponse.json({
        success: true,
        application,
        unchanged: true,
      });
    }

    const jobTitle =
      application.job.title ||
      "a job";

    const companyName =
      application.job.company
        ?.name;

    const where =
      companyName
        ? ` at ${companyName}`
        : "";

    /*
     * Update the application and create the
     * candidate notification in one transaction.
     *
     * If notification creation fails,
     * the application status update is rolled back.
     */
    const result =
      await db.$transaction(
        async (tx) => {
          const updated =
            await tx.application.update(
              {
                where: {
                  id,
                },
                data: {
                  status:
                    normalizedStatus,
                },
              }
            );

          await tx.notification.create({
            data: {
              userId:
                application.userId,
              type: "application",
              title:
                "Application Updated",
              message:
                `Your application for "${jobTitle}"${where} is now: ${normalizedStatus}.`,
              actionUrl:
                "/my-applications",
            },
          });

          return updated;
        }
      );

    return NextResponse.json({
      success: true,
      application: result,
    });
  } catch (error: unknown) {
    const err = error as {
      code?: string;
    };

    if (err.code === "P2025") {
      return NextResponse.json(
        {
          error:
            "Application not found",
        },
        { status: 404 }
      );
    }

    console.error(
      "Update application error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update application",
      },
      { status: 500 }
    );
  }
}
