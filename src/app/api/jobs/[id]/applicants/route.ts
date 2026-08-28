import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole, isEmployerRole } from "@/lib/roles";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const job = await db.job.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const role = session.user.role as string | undefined;
    const isJobPoster = job.postedById === session.user.id;
    const isCompanyOwner =
      !!job.company && job.company.ownerId === session.user.id;
    const isCompanyEmailOwner =
      !!job.company?.email &&
      !!session.user.email &&
      job.company.email === session.user.email;

    const hasPermission =
      isAdminRole(role) ||
      isJobPoster ||
      (isEmployerRole(role) && isCompanyOwner) ||
      isCompanyEmailOwner;

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const applications = await db.application.findMany({
      where: { jobId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                location: true,
                skills: true,
                phone: true,
                resumeUrl: true,
                bio: true,
              },
            },
          },
        },
      },
    });

    const serialized = applications.map((app) => {
      const skills = app.user.profile?.skills;
      let title: string | null = null;
      if (Array.isArray(skills) && skills.length > 0) {
        title = skills.slice(0, 3).join(", ");
      } else if (typeof skills === "string" && skills.trim()) {
        title = skills;
      }

      return {
        id: app.id,
        status: app.status === "applied" ? "pending" : app.status,
        coverLetter: app.coverLetter,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        user: {
          id: app.user.id,
          name: app.user.name,
          email: app.user.email,
          avatar: app.user.image,
          title,
          location: app.user.profile?.location || null,
          phone: app.user.profile?.phone || null,
          resumeUrl: app.user.profile?.resumeUrl || null,
          bio: app.user.profile?.bio || null,
        },
      };
    });

    return NextResponse.json({
      applications: serialized,
      job: {
        id: job.id,
        title: job.title,
      },
    });
  } catch (error) {
    console.error("Fetch applicants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applicants" },
      { status: 500 }
    );
  }
}
