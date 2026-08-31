import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmployerRole } from "@/lib/roles";
import {
  interviewCreateSchema,
} from "@/lib/validation/interview";

export async function GET() {
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
    const interviews =
      await db.interview.findMany({
        where: {
          company: {
            ownerId: session.user.id,
          },
        },

        orderBy: {
          scheduledAt: "asc",
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },

          job: {
            select: {
              id: true,
              title: true,
              company: {
                select: {
                  name: true,
                },
              },
            },
          },

          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    return NextResponse.json({
      interviews,
    });
  } catch (error) {
    console.error(
      "Get employer interviews error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load interviews",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest
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
      interviewCreateSchema.safeParse(body);

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

    const {
      jobId,
      userId,
      scheduledAt,
      duration,
      type,
      notes,
      meetLink,
    } = parsed.data;

    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error:
            "Interview must be scheduled for a future date",
        },
        { status: 400 }
      );
    }

    const job =
      await db.job.findFirst({
        where: {
          id: jobId,

          company: {
            ownerId: session.user.id,
          },
        },

        select: {
          id: true,
          title: true,
          companyId: true,

          company: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
        },
      });

    if (!job) {
      return NextResponse.json(
        {
          error:
            "Job not found or you do not own this job",
        },
        { status: 404 }
      );
    }

    if (!job.companyId) {
      return NextResponse.json(
        {
          error:
            "This job is not associated with a company",
        },
        { status: 400 }
      );
    }

    /*
     * Store the narrowed company ID in a local constant.
     * This prevents TypeScript from widening it back
     * to string | null inside the transaction callback.
     */
    const companyId = job.companyId;

    /*
     * Critical authorization check:
     * The candidate must actually have an application
     * for THIS job.
     */
    const application =
      await db.application.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },

        select: {
          id: true,
          userId: true,
          jobId: true,
          status: true,
        },
      });

    if (!application) {
      return NextResponse.json(
        {
          error:
            "Candidate has not applied for this job",
        },
        { status: 400 }
      );
    }

    /*
     * Do not schedule an interview for a rejected
     * application.
     */
    if (
      application.status ===
      "rejected"
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot schedule an interview for a rejected application",
        },
        { status: 400 }
      );
    }

    const candidate =
      await db.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          name: true,
          email: true,
        },
      });

    if (!candidate) {
      return NextResponse.json(
        {
          error: "Candidate not found",
        },
        { status: 404 }
      );
    }

    /*
     * Prevent duplicate active interviews for
     * the same candidate and job.
     */
    const existingInterview =
      await db.interview.findFirst({
        where: {
          userId,
          jobId,
          status: "scheduled",
        },

        select: {
          id: true,
        },
      });

    if (existingInterview) {
      return NextResponse.json(
        {
          error:
            "A scheduled interview already exists for this candidate and job",
        },
        { status: 409 }
      );
    }

    const result =
      await db.$transaction(
        async (tx) => {
          const interview =
            await tx.interview.create({
              data: {
                userId:
                  candidate.id,

                jobId:
                  job.id,

                companyId,

                scheduledAt,

                duration,

                type,

                meetLink:
                  meetLink || null,

                notes:
                  notes || null,

                status:
                  "scheduled",
              },

              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },

                job: {
                  select: {
                    id: true,
                    title: true,
                    company: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },

                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            });

          await tx.notification.create({
            data: {
              userId:
                candidate.id,

              type:
                "interview",

              title:
                "Interview Scheduled",

              message:
                `You have an interview for ${job.title}.`,

              actionUrl:
                "/my-interviews",
            },
          });

          return interview;
        }
      );

    return NextResponse.json(
      {
        success: true,
        interview: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err =
      error as {
        code?: string;
      };

    if (err.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A duplicate interview already exists",
        },
        { status: 409 }
      );
    }

    console.error(
      "Create interview error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create interview",
      },
      { status: 500 }
    );
  }
}
