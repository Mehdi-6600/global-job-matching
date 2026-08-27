import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const role = (user.role || "").toUpperCase();
    const isAdmin = role === "ADMIN";
    const isOwner = role === "OWNER";
    const isEmployer = role === "EMPLOYER";
    const isJobPoster = job.postedById === user.id;
    const isCompanyOwner =
      !!job.company && job.company.ownerId === user.id;
    const isCompanyEmailOwner =
      !!job.company?.email &&
      !!user.email &&
      job.company.email === user.email;

    const hasPermission =
      isAdmin ||
      isOwner ||
      isJobPoster ||
      (isEmployer && isCompanyOwner) ||
      isCompanyEmailOwner;

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const applications = await prisma.application.findMany({
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

    const serialized = applications.map((app) => ({
      id: app.id,
      status: app.status,
      coverLetter: app.coverLetter,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      user: {
        id: app.user.id,
        name: app.user.name,
        email: app.user.email,
        avatar: app.user.image,
        title: app.user.profile?.skills || null,
        location: app.user.profile?.location || null,
        phone: app.user.profile?.phone || null,
        resumeUrl: app.user.profile?.resumeUrl || null,
        bio: app.user.profile?.bio || null,
      },
    }));

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
