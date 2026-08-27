import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `savedjobs_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const savedJobs = await prisma.savedJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          include: {
            company: {
              select: { id: true, name: true, logo: true, location: true },
            },
            category: {
              select: { id: true, name: true, slug: true, color: true },
            },
          },
        },
      },
    });

    const jobs = savedJobs.map((sj) => sj.job).filter(Boolean);

    return NextResponse.json({ jobs, count: jobs.length });
  } catch (error) {
    console.error("Saved jobs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `savedjobs_post_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { jobId } = body;

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const existing = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId: session.user.id,
          jobId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, alreadySaved: true });
    }

    await prisma.savedJob.create({
      data: {
        userId: session.user.id,
        jobId,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ success: true, alreadySaved: true });
    }
    console.error("Save job error:", error);
    return NextResponse.json(
      { error: "Failed to save job" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId } = body;

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    await prisma.savedJob.deleteMany({
      where: {
        userId: session.user.id,
        jobId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove saved job error:", error);
    return NextResponse.json(
      { error: "Failed to remove saved job" },
      { status: 500 }
    );
  }
}
