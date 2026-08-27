import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

function parseInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? Math.trunc(parsed)
    : null;
}

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string"
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(
  req: NextRequest
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

  const role = session.user.role;

  const allowedRoles = [
    ROLES.EMPLOYER,
    ROLES.ADMIN,
    ROLES.OWNER,
  ];

  if (
    !allowedRoles.includes(
      role as (typeof allowedRoles)[number]
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
    const body = await req.json();

    if (
      !body.title ||
      !body.description ||
      !body.location ||
      !body.type
    ) {
      return NextResponse.json(
        {
          error:
            "Title, description, location and type are required",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.companyId) {
      return NextResponse.json(
        {
          error: "Company ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const company =
      await prisma.company.findFirst({
        where: {
          id: body.companyId,
          ownerId: session.user.id,
        },
      });

    if (!company) {
      return NextResponse.json(
        {
          error: "Company not found",
        },
        {
          status: 404,
        }
      );
    }

    const salaryMin =
      parseInteger(body.salaryMin);

    const salaryMax =
      parseInteger(body.salaryMax);

    const deadline =
      parseDate(body.deadline);

    if (
      salaryMin !== null &&
      salaryMax !== null &&
      salaryMin > salaryMax
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum salary cannot be greater than maximum salary",
        },
        {
          status: 400,
        }
      );
    }

    const remote = Boolean(body.remote);

    let categoryId: string | null = null;

    if (body.categoryId) {
      const category =
        await prisma.category.findUnique({
          where: {
            id: String(body.categoryId),
          },
          select: {
            id: true,
          },
        });

      if (!category) {
        return NextResponse.json(
          {
            error: "Category not found",
          },
          {
            status: 400,
          }
        );
      }

      categoryId = category.id;
    }

    const job =
      await prisma.job.create({
        data: {
          title: String(body.title).trim(),

          description:
            String(body.description).trim(),

          location:
            String(body.location).trim(),

          remote,

          type:
            String(body.type).trim(),

          experience:
            typeof body.experience ===
              "string" &&
            body.experience.trim()
              ? body.experience.trim()
              : null,

          salaryMin,

          salaryMax,

          currency:
            typeof body.currency ===
              "string" &&
            body.currency.trim()
              ? body.currency
                  .trim()
                  .toUpperCase()
              : "USD",

          requirements:
            cleanStringArray(
              body.requirements
            ),

          responsibilities:
            cleanStringArray(
              body.responsibilities
            ),

          benefits:
            cleanStringArray(
              body.benefits
            ),

          tags:
            cleanStringArray(
              body.tags
            ),

          deadline,

          companyId: company.id,

          categoryId,

          postedById:
            session.user.id,

          status: "active",
        },
      });

    const alerts =
      await prisma.jobAlert.findMany({
        where: {
          active: true,

          AND: [
            {
              OR: [
                {
                  keywords: null,
                },
                {
                  keywords: {
                    contains:
                      String(body.title),
                    mode:
                      "insensitive",
                  },
                },
              ],
            },

            {
              OR: [
                {
                  location: null,
                },
                {
                  location: {
                    contains:
                      String(
                        body.location
                      ),
                    mode:
                      "insensitive",
                  },
                },
              ],
            },

            {
              OR: [
                {
                  remote: null,
                },
                {
                  remote,
                },
              ],
            },

            {
              OR: [
                {
                  type: null,
                },
                {
                  type:
                    String(body.type),
                },
              ],
            },
          ],
        },
      });

    for (const alert of alerts) {
      let matches = true;

      if (
        alert.keywords &&
        !String(body.title)
          .toLowerCase()
          .includes(
            alert.keywords.toLowerCase()
          )
      ) {
        matches = false;
      }

      if (
        alert.location &&
        !String(body.location)
          .toLowerCase()
          .includes(
            alert.location.toLowerCase()
          )
      ) {
        matches = false;
      }

      if (
        alert.remote !== null &&
        alert.remote !== remote
      ) {
        matches = false;
      }

      if (
        alert.type &&
        alert.type !==
          String(body.type)
      ) {
        matches = false;
      }

      if (
        alert.minSalary !== null &&
        salaryMax !== null &&
        salaryMax <
          alert.minSalary
      ) {
        matches = false;
      }

      if (matches) {
        await prisma.notification.create({
          data: {
            userId:
              alert.userId,

            type: "job",

            title:
              "New Job Match!",

            message:
              `${job.title} at ${company.name} matches your alert.`,

            description:
              `${job.title} at ${company.name} matches your alert.`,

            actionUrl:
              `/jobs/${job.id}`,
          },
        });
      }
    }

    return NextResponse.json(
      {
        job,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create job error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create job",
      },
      {
        status: 500,
      }
    );
  }
}
