import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/saved-jobs - Get my saved jobs
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const savedJobs = await prisma.savedJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          include: {
            company: {
              select: { id: true, name: true, logo: true, location: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ savedJobs });
  } catch (error: any) {
    console.error("Fetch saved jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch saved jobs" },
      { status: 500 }
    );
  }
}

// POST /api/saved-jobs - Save a job
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const saved = await prisma.savedJob.create({
      data: {
        userId: session.user.id,
        jobId,
      },
    });

    return NextResponse.json({ success: true, saved });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Job already saved" },
        { status: 409 }
      );
    }
    console.error("Save job error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save job" },
      { status: 500 }
    );
  }
}

// DELETE /api/saved-jobs?jobId=xxx - Unsave a job
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobId = req.nextUrl.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    await prisma.savedJob.deleteMany({
      where: {
        userId: session.user.id,
        jobId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unsave job error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unsave job" },
      { status: 500 }
    );
  }
}
