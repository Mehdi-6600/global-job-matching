import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmployerRole, isAdminRole } from "@/lib/roles";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { computeMatchScore } from "@/lib/matching/score";

/**
 * Rank applicants for a job owned by the employer.
 * GET /api/employer/jobs/[id]/candidates
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !isEmployerRole(session.user.role) &&
      !isAdminRole(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: "Job id required" }, { status: 400 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `emp_candidates_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const job = await db.job.findFirst({
      where: isAdminRole(session.user.role)
        ? { id: jobId }
        : {
            id: jobId,
            company: { ownerId: session.user.id },
          },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        remote: true,
        experience: true,
        requirements: true,
        tags: true,
        type: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found or not owned by you" },
        { status: 404 }
      );
    }

    const applications = await db.application.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        createdAt: true,
        coverLetter: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                skills: true,
                bio: true,
                experience: true,
                education: true,
                location: true,
              },
            },
          },
        },
      },
    });

    const candidates = applications
      .map((app) => {
        const profile = app.user.profile || {
          skills: null,
          bio: null,
          experience: null,
          education: null,
          location: null,
        };
        const match = computeMatchScore(profile, {
          title: job.title,
          description: job.description,
          location: job.location,
          remote: job.remote,
          experience: job.experience,
          requirements: job.requirements,
          tags: job.tags,
          type: job.type,
        });
        return {
          applicationId: app.id,
          status: app.status,
          appliedAt: app.createdAt,
          user: {
            id: app.user.id,
            name: app.user.name,
            email: app.user.email,
            image: app.user.image,
            location: profile.location,
            skills: profile.skills,
          },
          match,
        };
      })
      .sort((a, b) => b.match.score - a.match.score);

    return NextResponse.json({
      jobId: job.id,
      title: job.title,
      candidates,
      count: candidates.length,
    });
  } catch (error) {
    console.error("Employer candidates match error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
