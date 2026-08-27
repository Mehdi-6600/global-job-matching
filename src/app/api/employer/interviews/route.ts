import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

const EMPLOYER_ROLES = [
  ROLES.EMPLOYER,
  ROLES.ADMIN,
  ROLES.OWNER,
];

function isEmployerRole(role: string | undefined): boolean {
  return (
    role === ROLES.EMPLOYER ||
    role === ROLES.ADMIN ||
    role === ROLES.OWNER
  );
}

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
    const interviews = await prisma.interview.findMany({
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
        error: "Failed to load interviews",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    const body = await req.json();

    const {
      jobId,
      userId,
      scheduledAt,
      duration,
      type,
      notes,
      meetLink,
    } = body;

    if (!jobId || !userId || !scheduledAt) {
      return NextResponse.json(
        {
          error:
            "Job, user, and date are required",
        },
        { status: 400 }
      );
    }

    const parsedDate = new Date(scheduledAt);

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid interview date",
        },
        { status: 400 }
      );
    }

    const job = await prisma.job.findFirst({
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

    const candidate = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
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

    const parsedDuration = Number(duration);

    const interviewDuration =
      Number.isFinite(parsedDuration) &&
      parsedDuration > 0
        ? Math.round(parsedDuration)
        : 30;

    const interviewType =
      typeof type === "string" && type.trim()
        ? type.trim()
        : "video";

    const interviewNotes =
      typeof notes === "string" && notes.trim()
        ? notes.trim()
        : null;

    const interviewMeetLink =
      typeof meetLink === "string" &&
      meetLink.trim()
        ? meetLink.trim()
        : null;

    const interview = await prisma.interview.create({
      data: {
        userId: candidate.id,
        jobId: job.id,
        companyId: job.companyId,
        scheduledAt: parsedDate,
        duration: interviewDuration,
        type: interviewType,
        meetLink: interviewMeetLink,
        notes: interviewNotes,
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

    await prisma.notification.create({
      data: {
        userId: candidate.id,
        type: "interview",
        title: "Interview Scheduled",
        message:
          `You have an interview for ${job.title}`,
      },
    });

    return NextResponse.json(
      {
        interview,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create interview error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to create interview",
      },
      { status: 500 }
    );
  }
}
