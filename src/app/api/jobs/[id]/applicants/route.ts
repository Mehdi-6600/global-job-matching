import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if user owns this job's company
    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: { select: { email: true } } },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Only company owner or admin can view applicants
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, role: true },
    });

    if (job.company.email !== user?.email && user?.role !== "admin" && user?.role !== "owner") {
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
            title: true,
            location: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error("Fetch applicants error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch applicants" },
      { status: 500 }
    );
  }
}
