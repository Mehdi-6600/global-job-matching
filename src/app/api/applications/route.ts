import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/applications - Apply to a job
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId, coverLetter } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    // Check if already applied
    const existing = await prisma.application.findFirst({
      where: {
        userId: session.user.id,
        jobId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied to this job" },
        { status: 409 }
      );
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        userId: session.user.id,
        jobId,
        coverLetter: coverLetter || null,
        status: "applied",
      },
    });

    // Increment applicant count
    await prisma.job.update({
      where: { id: jobId },
      data: { applicantCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.error("Apply error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply" },
      { status: 500 }
    );
  }
}

// GET /api/applications - Get my applications
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applications = await prisma.application.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            type: true,
            company: {
              select: { id: true, name: true, logo: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error("Fetch applications error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
