import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = ["employer", "admin", "owner"];
  if (!allowed.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const interviews = await prisma.interview.findMany({
    where: {
      job: {
        company: {
          ownerId: session.user.id,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
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
    },
  });

  return NextResponse.json({ interviews });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = ["employer", "admin", "owner"];
  if (!allowed.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { jobId, userId, scheduledAt, duration, type, notes, meetLink } = await req.json();

    if (!jobId || !userId || !scheduledAt) {
      return NextResponse.json({ error: "Job, user, and date required" }, { status: 400 });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        company: {
          ownerId: session.user.id,
        },
      },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const interview = await prisma.interview.create({
      data: {
        jobId,
        userId,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 30,
        type: type || "video",
        notes: notes || null,
        meetLink: meetLink || null,
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: "interview",
        title: "Interview Scheduled",
        description: `You have an interview for ${job.title}`,
        actionUrl: "/my-interviews",
      },
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    console.error("Create interview error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
