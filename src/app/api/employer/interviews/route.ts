import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmployerRole } from "@/lib/roles";
import { interviewCreateSchema } from "@/lib/validation/interview";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type SessionUser = {
  id: string;
  role: string;
};

type ApiError = {
  error: string;
  details?: unknown;
};

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

function jsonError(
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    details !== undefined ? { error: message, details } : { error: message },
    { status }
  );
}

async function authenticateEmployer(): Promise<
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse<ApiError> }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  if (!isEmployerRole(session.user.role)) {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  return {
    ok: true,
    user: { id: session.user.id, role: session.user.role },
  };
}

async function enforceRateLimit(
  key: string
): Promise<NextResponse<ApiError> | null> {
  const limited = await ratelimit.limit(key);
  if (!limited.success) {
    return jsonError("Too many requests", 429);
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                    GET                                     */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const authResult = await authenticateEmployer();
  if (!authResult.ok) return authResult.response;

  const { user } = authResult;
  const ip = getRequestIp(req);

  const rateLimited = await enforceRateLimit(
    `employer_interviews_get_${user.id}_${ip}`
  );
  if (rateLimited) return rateLimited;

  try {
    const interviews = await db.interview.findMany({
      where: {
        company: {
          ownerId: user.id,
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
    console.error("Get employer interviews error:", error);
    return jsonError("Failed to load interviews", 500);
  }
}

/* -------------------------------------------------------------------------- */
/*                                    POST                                    */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const authResult = await authenticateEmployer();
  if (!authResult.ok) return authResult.response;

  const { user } = authResult;
  const ip = getRequestIp(req);

  const rateLimited = await enforceRateLimit(
    `employer_interviews_post_${user.id}_${ip}`
  );
  if (rateLimited) return rateLimited;

  /* ------------------------------ Parse body ------------------------------ */

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = interviewCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "Invalid input",
      400,
      parsed.error.flatten().fieldErrors
    );
  }

  const { jobId, userId, scheduledAt, duration, type, notes, meetLink } =
    parsed.data;

  /* ------------------------- Business validations ------------------------- */

  if (scheduledAt.getTime() <= Date.now()) {
    return jsonError("Interview must be scheduled for a future date", 400);
  }

  try {
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        company: {
          ownerId: user.id,
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
      return jsonError(
        "Job not found or you do not own this job",
        404
      );
    }

    if (!job.companyId) {
      return jsonError("This job is not associated with a company", 400);
    }

    const companyId = job.companyId;

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
      return jsonError("Candidate has not applied for this job", 400);
    }

    if (application.status === "rejected") {
      return jsonError(
        "Cannot schedule an interview for a rejected application",
        400
      );
    }

    const candidate = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!candidate) {
      return jsonError("Candidate not found", 404);
    }

    const existingInterview = await db.interview.findFirst({
      where: {
        userId,
        jobId,
        status: "scheduled",
      },
      select: { id: true },
    });

    if (existingInterview) {
      return jsonError(
        "A scheduled interview already exists for this candidate and job",
        409
      );
    }

    /* --------------------------- Prepare notes --------------------------- */

    const notesParts = [
      notes?.trim() || null,
      duration != null ? `Duration: ${duration} min` : null,
      type ? `Type: ${type}` : null,
      meetLink?.trim() ? `Meet link: ${meetLink.trim()}` : null,
    ].filter((part): part is string => Boolean(part));

    /* --------------------------- Transaction ---------------------------- */

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

    return NextResponse.json(
      { success: true, interview: result },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: string };

    if (err.code === "P2002") {
      return jsonError("A duplicate interview already exists", 409);
    }

    console.error("Create interview error:", error);
    return jsonError("Failed to create interview", 500);
  }
}
