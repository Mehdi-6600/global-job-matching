import {
  NextResponse,
} from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import {
  isAdminRole,
} from "@/lib/roles";

import {
  normalizeLocation,
} from "@/lib/location";

import {
  companyUpdateSchema,
} from "@/lib/validation/company";

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await params;

    if (
      !id ||
      id.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid company ID",
        },
        {
          status: 400,
        }
      );
    }

    const company =
      await db.company.findUnique({
        where: {
          id,
        },

        include: {
          jobs: {
            where: {
              status:
                "active",
            },

            take: 10,

            orderBy: {
              createdAt:
                "desc",
            },

            select: {
              id: true,
              title: true,
              description: true,
              location: true,
              salary: true,
              salaryMin: true,
              salaryMax: true,
              currency: true,
              type: true,
              remote: true,
              experience: true,
              deadline: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              requirements: true,
              responsibilities: true,
              benefits: true,
              tags: true,
              categoryId: true,
            },
          },

          _count: {
            select: {
              jobs: {
                where: {
                  status:
                    "active",
                },
              },
            },
          },
        },
      });

    if (
      !company ||
      company.status !==
        "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      company: {
        id:
          company.id,

        name:
          company.name,

        slug:
          company.slug,

        description:
          company.description,

        location:
          normalizeLocation(
            company.location
          ) ||
          company.location,

        website:
          company.website,

        logo:
          company.logo,

        status:
          company.status,

        createdAt:
          company.createdAt,

        updatedAt:
          company.updatedAt,

        activeJobs:
          company._count.jobs,

        jobs:
          company.jobs.map(
            (job) => ({
              ...job,

              location:
                normalizeLocation(
                  job.location
                ) ||
                job.location,
            })
          ),
      },
    });
  } catch (error) {
    console.error(
      "Company get error:",
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
    params: Promise<{
      id: string;
    }>;
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

    const { id } =
      await params;

    if (
      !id ||
      id.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid company ID",
        },
        {
          status: 400,
        }
      );
    }

    const company =
      await db.company.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          ownerId: true,
          status: true,
        },
      });

    if (!company) {
      return NextResponse.json(
        {
          error:
            "Not found",
        },
        {
          status: 404,
        }
      );
    }

    const isOwner =
      company.ownerId ===
      session.user.id;

    const isAdmin =
      isAdminRole(
        session.user.role
      );

    if (
      !isOwner &&
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
      companyUpdateSchema.safeParse(
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

    const data = {
      ...(parsed.data
        .name !==
      undefined
        ? {
            name:
              parsed.data
                .name,
          }
        : {}),

      ...(parsed.data
        .description !==
      undefined
        ? {
            description:
              parsed.data
                .description ??
              null,
          }
        : {}),

      ...(parsed.data
        .location !==
      undefined
        ? {
            location:
              parsed.data
                .location
                ? normalizeLocation(
                    parsed.data
                      .location
                  ) ||
                  parsed.data
                    .location
                    .trim()
                : null,
          }
        : {}),

      ...(parsed.data
        .website !==
      undefined
        ? {
            website:
              parsed.data
                .website ??
              null,
          }
        : {}),
    };

    const updated =
      await db.company.update({
        where: {
          id,
        },

        data,
      });

    return NextResponse.json({
      success: true,

      company: {
        id:
          updated.id,

        name:
          updated.name,

        slug:
          updated.slug,

        description:
          updated.description,

        location:
          normalizeLocation(
            updated.location
          ) ||
          updated.location,

        website:
          updated.website,

        logo:
          updated.logo,

        status:
          updated.status,

        createdAt:
          updated.createdAt,

        updatedAt:
          updated.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Company patch error:",
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
    params: Promise<{
      id: string;
    }>;
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

    const { id } =
      await params;

    if (
      !id ||
      id.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid company ID",
        },
        {
          status: 400,
        }
      );
    }

    const company =
      await db.company.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          ownerId: true,
        },
      });

    if (!company) {
      return NextResponse.json(
        {
          error:
            "Not found",
        },
        {
          status: 404,
        }
      );
    }

    const isOwner =
      company.ownerId ===
      session.user.id;

    const isAdmin =
      isAdminRole(
        session.user.role
      );

    if (
      !isOwner &&
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

    /*
     * Prisma schema uses Cascade/SetNull relations
     * where appropriate, so use the existing database
     * relationship rules rather than manually deleting
     * unrelated records here.
     */
    await db.company.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Company delete error:",
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
