import {
  NextRequest,
  NextResponse,
} from "next/server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";

import {
  jobUpdateSchema,
} from "@/lib/validation/job";

import {
  jobIdSchema,
} from "@/lib/validation/job-id";

import {
  ratelimit,
} from "@/lib/ratelimit";

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id: rawId } =
      await params;

    const parsedId =
      jobIdSchema.safeParse(
        rawId
      );

    if (!parsedId.success) {
      return NextResponse.json(
        {
          error:
            "Invalid job ID",
        },
        {
          status: 400,
        }
      );
    }

    const id =
      parsedId.data;

    /*
     * Rate-limit public job requests.
     */
    const ip =
      req.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() ||
      req.headers.get(
        "x-real-ip"
      ) ||
      "unknown";

    const {
      success,
    } =
      await ratelimit.limit(
        `job_get_${id}_${ip}`
      );

    if (!success) {
      return NextResponse.json(
        {
          error:
            "Too many requests. Please try again later.",
        },
        {
          status: 429,
        }
      );
    }

    const job =
      await db.job.findUnique({
        where: {
          id,
        },

        include: {
          company: {
            select: {
              id: true,
              name: true,
              location: true,
              logo: true,
              description: true,
              website: true,
            },
          },

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
            },
          },

          postedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    if (!job) {
      return NextResponse.json(
        {
          error: "Not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Increment the view count only after the
     * requested job has been found.
     */
    const updated =
      await db.job.update({
        where: {
          id,
        },

        data: {
          viewCount: {
            increment: 1,
          },
        },

        select: {
          viewCount: true,
        },
      });

    /*
     * Public response.
     *
     * IMPORTANT:
     * applicant count is intentionally not exposed.
     */
    return NextResponse.json({
      job: {
        id: job.id,

        title:
          job.title,

        description:
          job.description,

        location:
          normalizeLocation(
            job.location
          ) ||
          job.location,

        salary:
          job.salary,

        salaryMin:
          job.salaryMin,

        salaryMax:
          job.salaryMax,

        currency:
          job.currency,

        type:
          job.type,

        experience:
          job.experience,

        remote:
          job.remote,

        status:
          job.status,

        createdAt:
          job.createdAt,

        updatedAt:
          job.updatedAt,

        deadline:
          job.deadline,

        viewCount:
          updated.viewCount,

        requirements:
          job.requirements,

        responsibilities:
          job.responsibilities,

        benefits:
          job.benefits,

        tags:
          job.tags,

        company:
          job.company
            ? {
                id:
                  job.company.id,

                name:
                  job.company.name,

                location:
                  normalizeLocation(
                    job.company
                      .location
                  ) ||
                  job.company
                    .location,

                logo:
                  job.company.logo,

                description:
                  job.company
                    .description,

                website:
                  job.company
                    .website,
              }
            : null,

        category:
          job.category,

        postedBy:
          job.postedBy
            ? {
                id:
                  job.postedBy.id,

                name:
                  job.postedBy.name,
              }
            : null,
      },
    });
  } catch (error) {
    console.error(
      "Job GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const session =
      await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { id: rawId } =
      await params;

    const parsedId =
      jobIdSchema.safeParse(
        rawId
      );

    if (!parsedId.success) {
      return NextResponse.json(
        {
          error:
            "Invalid job ID",
        },
        {
          status: 400,
        }
      );
    }

    const id =
      parsedId.data;

    /*
     * Load ownership information before allowing
     * any modification.
     */
    const job =
      await db.job.findUnique({
        where: {
          id,
        },

        include: {
          company: {
            select: {
              ownerId: true,
            },
          },
        },
      });

    if (!job) {
      return NextResponse.json(
        {
          error: "Not found",
        },
        {
          status: 404,
        }
      );
    }

    const isOwner =
      job.company
        ?.ownerId ===
      session.user.id;

    const isPoster =
      job.postedById ===
      session.user.id;

    const isAdmin =
      isAdminRole(
        session.user.role
      );

    if (
      !isOwner &&
      !isPoster &&
      !isAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    let body: unknown;

    try {
      body =
        await req.json();
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
      jobUpdateSchema.safeParse(
        body
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid input",

          details:
            parsed.error
              .flatten()
              .fieldErrors,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Keep only fields accepted by the existing
     * project validation schema.
     */
    const data = {
      ...parsed.data,

      location:
        parsed.data.location !==
        undefined
          ? normalizeLocation(
              parsed.data
                .location
            ) ||
            parsed.data
              .location
              .trim()
          : undefined,
    };

    const updated =
      await db.job.update({
        where: {
          id,
        },

        data,
      });

    return NextResponse.json({
      success: true,

      job: {
        ...updated,

        location:
          normalizeLocation(
            updated.location
          ) ||
          updated.location,
      },
    });
  } catch (error) {
    console.error(
      "Job PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const session =
      await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { id: rawId } =
      await params;

    const parsedId =
      jobIdSchema.safeParse(
        rawId
      );

    if (!parsedId.success) {
      return NextResponse.json(
        {
          error:
            "Invalid job ID",
        },
        {
          status: 400,
        }
      );
    }

    const id =
      parsedId.data;

    const job =
      await db.job.findUnique({
        where: {
          id,
        },

        include: {
          company: {
            select: {
              ownerId: true,
            },
          },
        },
      });

    if (!job) {
      return NextResponse.json(
        {
          error: "Not found",
        },
        {
          status: 404,
        }
      );
    }

    const isOwner =
      job.company
        ?.ownerId ===
      session.user.id;

    const isPoster =
      job.postedById ===
      session.user.id;

    const isAdmin =
      isAdminRole(
        session.user.role
      );

    if (
      !isOwner &&
      !isPoster &&
      !isAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    await db.job.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Job DELETE error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
