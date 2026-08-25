import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    const where: any = { userId: session.user.id };
    if (status) where.status = status;

    const [applications, total] = await Promise.all([
      db.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              location: true,
              salary: true,
              type: true,
              category: true,
              company: {
                select: { id: true, name: true, logo: true, location: true },
              },
            },
          },
        },
      }),
      db.application.count({ where }),
    ]);

    return NextResponse.json({
      applications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("Fetch applications error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch applications" },
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

    const { jobId, coverLetter, resume } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const existing = await db.application.findUnique({
      where: { userId_jobId: { userId: session.user.id, jobId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this job" },
        { status: 409 }
      );
    }

    const application = await db.application.create({
      data: {
        userId: session.user.id,
        jobId,
        coverLetter: coverLetter || null,
        resume: resume || null,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            salary: true,
            type: true,
            category: true,
            company: {
              select: { id: true, name: true, logo: true, location: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.error("Create application error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply" },
      { status: 500 }
    );
  }
}
