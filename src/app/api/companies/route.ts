import {
  NextResponse,
} from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import {
  isEmployerRole,
} from "@/lib/roles";

import {
  normalizeLocation,
} from "@/lib/location";

import {
  companyCreateSchema,
} from "@/lib/validation/company";

export async function POST(
  req: Request
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

    if (
      !isEmployerRole(
        session.user.role
      )
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
      companyCreateSchema.safeParse(
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

    const {
      name,
      description,
      location,
      website,
    } = parsed.data;

    const normalizedLocation =
      location
        ? normalizeLocation(
            location
          ) || location
        : null;

    const company =
      await db.company.create({
        data: {
          name,

          description:
            description ??
            null,

          location:
            normalizedLocation,

          website:
            website ?? null,

          ownerId:
            session.user.id,

          email:
            session.user.email ||
            null,
        },
      });

    return NextResponse.json(
      {
        success: true,

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
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Company create error:",
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

export async function GET(
  req: Request
) {
  try {
    const {
      searchParams,
    } = new URL(req.url);

    const rawPage =
      searchParams.get(
        "page"
      );

    const rawLimit =
      searchParams.get(
        "limit"
      );

    const pageNumber =
      Number.parseInt(
        rawPage || "1",
        10
      );

    const limitNumber =
      Number.parseInt(
        rawLimit || "10",
        10
      );

    const page =
      Number.isFinite(
        pageNumber
      )
        ? Math.max(
            1,
            pageNumber
          )
        : 1;

    const limit =
      Number.isFinite(
        limitNumber
      )
        ? Math.min(
            100,
            Math.max(
              1,
              limitNumber
            )
          )
        : 10;

    const skip =
      (page - 1) *
      limit;

    const search =
      searchParams
        .get("search")
        ?.trim()
        .slice(0, 100) ||
      "";

    const where: {
      status: string;
      OR?: Array<{
        name?: {
          contains: string;
          mode: "insensitive";
        };
        location?: {
          contains: string;
          mode: "insensitive";
        };
        description?: {
          contains: string;
          mode: "insensitive";
        };
      }>;
    } = {
      status: "active",
    };

    if (search) {
      where.OR = [
        {
          name: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },

        {
          location: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },

        {
          description: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
      ];
    }

    const [
      companies,
      total,
    ] = await Promise.all([
      db.company.findMany({
        where,

        skip,

        take: limit,

        orderBy: {
          createdAt:
            "desc",
        },

        include: {
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
      }),

      db.company.count({
        where,
      }),
    ]);

    /*
     * Public API deliberately does not expose:
     * - owner
     * - owner ID
     * - company email
     */
    const serialized =
      companies.map(
        (company) => ({
          id:
            company.id,

          name:
            company.name,

          slug:
            company.slug,

          website:
            company.website,

          location:
            normalizeLocation(
              company.location
            ) ||
            company.location,

          description:
            company.description,

          logo:
            company.logo,

          status:
            company.status,

          createdAt:
            company.createdAt,

          activeJobs:
            company._count.jobs,
        })
      );

    return NextResponse.json(
      {
        companies:
          serialized,

        pagination: {
          page,

          limit,

          total,

          totalPages:
            Math.ceil(
              total / limit
            ) || 1,
        },
      }
    );
  } catch (error) {
    console.error(
      "Companies fetch error:",
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
