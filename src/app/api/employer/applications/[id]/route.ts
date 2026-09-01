import {
  NextRequest,
  NextResponse,
} from "next/server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

import {
  isAdminRole,
  isEmployerRole,
} from "@/lib/roles";

import {
  normalizeApplicationStatus,
} from "@/lib/application-status";

import {
  applicationStatusUpdateSchema,
} from "@/lib/validation/application-status-update";

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
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  if (
    !isEmployerRole(
      session.user.role
    )
  ) {
    return NextResponse.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Application ID is required",
        },
        {
          status: 400,
        }
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON body",
        },
        {
          status: 400,
        }
      );
    }

    const parsed =
      applicationStatusUpdateSchema.safeParse(
        body
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid input",

          details:
            parsed.error.flatten()
              .fieldErrors,
        },
        {
          status: 400,
        }
      );
    }

    const status =
      normalizeApplicationStatus(
        parsed.data.status
      );

    if (!status) {
      return NextResponse.json(
        {
          error:
            "Invalid application status",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Load the application together with the
     * ownership information of the related job.
     */
    const application =
      await db.application.findUnique({
        where: {
          id,
        },

        include: {
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
        {
          status: 404,
        }
      );
    }

    /*
     * Authorization:
     *
     * 1. Company owner
     * 2. Job poster
     * 3. Admin
     *
     * Everyone else is rejected.
     */
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
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Avoid unnecessary updates and duplicate
     * status-change notifications.
     */
    if (
      application.status ===
      status
    ) {
      return NextResponse.json({
        success: true,
        application,
        changed: false,
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
     * notification atomically.
     */
    const result =
      await db.$transaction(
        async (tx) => {
          const updated =
            await tx.application.update({
              where: {
                id,
              },

              data: {
                status,
              },
            });

          await tx.notification.create({
            data: {
              userId:
                application.userId,

              type:
                "application",

              title:
                "Application Status Updated",

              message:
                `Your application for "${jobTitle}"${where} is now: ${status}.`,

              actionUrl:
                "/my-applications",
            },
          });

          return updated;
        }
      );

    return NextResponse.json({
      success: true,
      changed: true,
      application: result,
    });
  } catch (error: unknown) {
    const err =
      error as {
        code?: string;
      };

    if (
      err.code === "P2025"
    ) {
      return NextResponse.json(
        {
          error:
            "Application not found",
        },
        {
          status: 404,
        }
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
      {
        status: 500,
      }
    );
  }
}
