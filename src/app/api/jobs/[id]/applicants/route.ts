import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
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

    const user = session.user;

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Job ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const job = await prisma.job.findUnique({
      where: {
        id,
      },
      include: {
        company: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        {
          error: "Job not found",
        },
        {
          status: 404,
        }
      );
    }

    const isAdmin =
      user.role === "ADMIN" ||
      user.role === "admin";

    const isOwner =
      user.role === "OWNER" ||
      user.role === "owner";

    const isEmployer =
      user.role === "EMPLOYER" ||
      user.role === "employer";

    const isJobOwner =
      job.postedById === user.id;

    const isCompanyOwner =
      !!job.company &&
      job.company.ownerId === user.id;

    if (
      !isAdmin &&
      !isOwner &&
      !isJobOwner &&
      !(isEmployer && isCompanyOwner)
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

    const applications =
      await prisma.application.findMany({
        where: {
          jobId: job.id,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(
      {
        job: {
          id: job.id,
          title: job.title,
          company: job.company
            ? {
                id: job.company.id,
                name: job.company.name,
                email: job.company.email,
              }
            : null,
        },
        applications,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Get job applicants error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load job applicants",
      },
      {
        status: 500,
      }
    );
  }
}
