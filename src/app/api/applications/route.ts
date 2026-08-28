import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";

const applySchema = z.object({
  jobId: z.string().min(1),
  coverLetter: z.string().max(5000).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `applications_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const applications = await db.application.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            remote: true,
            type: true,
            salary: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            company: {
              select: { id: true, name: true, logo: true, location: true },
            },
            category: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ applications, count: applications.length });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `apply_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many applications. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = applySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { jobId, coverLetter } = result.data;

    const job = await db.job.findUnique({
      where: { id: jobId, status: "active" },
    });
    if (!job) {
      return NextResponse.json(
        { error: "Job not found or no longer active." },
        { status: 404 }
      );
    }

    const application = await db.application.create({
      data: {
        userId: session.user.id,
        jobId,
        coverLetter: coverLetter || null,
        status: "pending",
      },
    });

    return NextResponse.json(
      { success: true, application },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "You have already applied for this job." },
        { status: 409 }
      );
    }

    console.error("Application error:", error);
    return NextResponse.json(
      { error: "Failed to submit application." },
      { status: 500 }
    );
  }
}
