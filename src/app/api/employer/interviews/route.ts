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

  const companies = await prisma.company.findMany({
    where: { ownerId: session.user.id },
    select: { id: true },
  });

  const companyIds = companies.map((c) => c.id);

  const interviews = await prisma.interview.findMany({
    where: {
      companyId: { in: companyIds },
    },
    orderBy: { scheduledAt: "asc" },
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
    const { jobId, userId, scheduledAt, notes } = await req.json();

    if (!jobId || !userId || !scheduledAt) {
      return NextResponse.json({ error: "Job, user, and date required" }, { status: 400 });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        company: { ownerId: session.user.id },
      },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const company = await prisma.company.findFirst({
      where: { ownerId: session.user.id },
    });

    const interview = await prisma.interview.create({
      data: {
        jobId,
        userId,
        companyId: company?.id || "",
        scheduledAt: new Date(scheduledAt),
        notes: notes || null,
        status: "scheduled",
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: "interview",
        title: "Interview Scheduled",
        message: `You have an interview for ${job.title}`,
      },
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    console.error("Create interview error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
