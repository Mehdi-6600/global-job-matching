import {
  NextRequest,
  NextResponse,
} from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
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
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

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

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    const normalizedRole = user.role?.toLowerCase();

    const isAdmin = normalizedRole === "admin";
    const isOwner = normalizedRole === "owner";
    const isEmployer = normalizedRole === "employer";
    const isJobPoster = job.postedById === user.id;
    const isCompanyOwner =
      !!job.company && job.company.ownerId === user.id;
    const isCompanyEmailOwner =
      !!job.company?.email &&
      !!user.email &&
      job.company.email === user.email;

    const hasPermission =
      isAdmin ||
      isOwner ||
      isJobPoster ||
      (isEmployer && isCompanyOwner) ||
      isCompanyEmailOwner;

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const applications = await prisma.application.findMany({
      where: {
        jobId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                location: true,
              },
            },
          },
        },
      },
    });

    const serializedApplications = applications.map((application) => ({
      ...application,
      user: {
        id: application.user.id,
        name: application.user.name,
        email: application.user.email,
        image: application.user.image,
        avatar: application.user.image,
        location: application.user.profile?.location ?? null,
        title: null,
      },
    }));

    return NextResponse.json({
      applications: serializedApplications,
    });
  } catch (error) {
    console.error("Fetch applicants error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch applicants",
      },
      {
        status: 500,
      }
    );
  }
}
