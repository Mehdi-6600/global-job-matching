import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role as string) || "jobseeker";
    if (role !== ROLES.ADMIN && role !== ROLES.OWNER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [totalUsers, totalCompanies, totalJobs, totalApplications, pendingCompanies, pendingJobs] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.company.count({ where: { status: "pending" } }),
      prisma.job.count({ where: { status: "pending" } }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalCompanies,
        totalJobs,
        totalApplications,
        pendingCompanies,
        pendingJobs,
      },
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
