import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmployerRole } from "@/lib/roles";
import { interviewCreateSchema } from "@/lib/validation/interview";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";

// ---------------------------------------------------------------------------
// GET /api/employer/interviews
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // -------------------------------------------------------------------------
  // 1) Auth
  // -------------------------------------------------------------------------
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmployerRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // -------------------------------------------------------------------------
  // 2) Rate limit
  // -------------------------------------------------------------------------
  const ip = getRequestIp(req);
  const limited = await ratelimit.limit(
    `employer_interviews_get_${session.user.id}_${ip}`
  );
  if (!limited.success) {
    return rateLimitedResponse(limited, "Too many requests");
  }

  // -------------------------------------------------------------------------
  // 3) Query interviews owned by this employer
  // -------------------------------------------------------------------------
  try {
    const interviews = await db.interview.findMany({
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

    return NextResponse.json({ interviews });
  } catch (error) {
    console.error("[employer/interviews] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load interviews" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/employer/interviews
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // -------------------------------------------------------------------------
  // 1) Auth
  // -------------------------------------------------------------------------
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmployerRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // -------------------------------------------------------------------------
  // 2) Rate limit
  // -------------------------------------------------------------------------
  const ip = getRequestIp(req);
  const limited = await ratelimit.limit(
    `employer_interviews_post_${session.user.id}_${ip}`
  );
  if (!limited.success) {
    return rateLimitedResponse(limited, "Too many requests");
  }

  try {
    // -----------------------------------------------------------------------
    // 3) Parse JSON body
    // -----------------------------------------------------------------------
    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 4) Validate input
    // -----------------------------------------------------------------------
    const parsed = interviewCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      jobId,
      userId,
      scheduledAt,
      duration,
      type,
      notes,
      meetLink,
    } = parsed.data;

    // -----------------------------------------------------------------------
    // 5) Interview must be scheduled in the future
    // -----------------------------------------------------------------------
    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Interview must be scheduled for a future date" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 6) Job ownership check
    // -----------------------------------------------------------------------
    const job = await db.job.findFirst({
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
        company: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found or you do not own this job" },
        { status: 404 }
      );
    }

    if (!job.companyId) {
      return NextResponse.json(
        { error: "This job is not associated with a company" },
        { status: 400 }
      );
    }

    const companyId = job.companyId;

    // -----------------------------------------------------------------------
    // 7) Candidate must have applied for this job
    // -----------------------------------------------------------------------
    const application = await db.application.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
      select: {
        id: true,
        userId: true,
        jobId: true,
        status: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Candidate has not applied for this job" },
        { status: 400 }
      );
    }

    if (application.status === "rejected") {
      return NextResponse.json(
        {
          error:
            "Cannot schedule an interview for a rejected application",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 8) Candidate must exist
    // -----------------------------------------------------------------------
    const candidate = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // -----------------------------------------------------------------------
    // 9) Prevent duplicate scheduled interview for same (candidate, job)
    // -----------------------------------------------------------------------
    const existingInterview = await db.interview.findFirst({
      where: {
        userId,
        jobId,
        status: "scheduled",
      },
      select: { id: true },
    });

    if (existingInterview) {
      return NextResponse.json(
        {
          error:
            "A scheduled interview already exists for this candidate and job",
        },
        { status: 409 }
      );
    }

    // -----------------------------------------------------------------------
    // 10) Compose notes (structured, single text field in DB)
    // -----------------------------------------------------------------------
    const notesParts = [
      notes?.trim() || null,
      duration != null ? `Duration: ${duration} min` : null,
      type ? `Type: ${type}` : null,
      meetLink?.trim() ? `Meet link: ${meetLink.trim()}` : null,
    ].filter(Boolean);

    // -----------------------------------------------------------------------
    // 11) Atomic: create interview + notify candidate
    // -----------------------------------------------------------------------
    const result = await db.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          userId: candidate.id,
          jobId: job.id,
          companyId,
          applicationId: application.id,
          scheduledAt,
          status: "scheduled",
          notes: notesParts.length > 0 ? notesParts.join("\n") : null,
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

      await tx.notification.create({
        data: {
          userId: candidate.id,
          type: "interview",
          title: "Interview Scheduled",
          message: `You have an interview for ${job.title}.`,
          actionUrl: "/my-interviews",
        },
      });

      return interview;
    });

    // -----------------------------------------------------------------------
    // 12) Success
    // -----------------------------------------------------------------------
    return NextResponse.json(
      { success: true, interview: result },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: string };

    // Prisma unique constraint violation (race on duplicate interview)
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A duplicate interview already exists" },
        { status: 409 }
      );
    }

    console.error("[employer/interviews] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 }
    );
  }
}
