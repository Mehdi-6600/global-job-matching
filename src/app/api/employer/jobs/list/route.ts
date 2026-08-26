import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { ratelimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role as string) || "jobseeker";
    if (role !== ROLES.EMPLOYER && role !== ROLES.ADMIN && role !== ROLES.OWNER) {
      return NextResponse.json(
        { error: "Only employers can access this." },
        { status: 403 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `employer_jobs_list_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const companies = await prisma.company.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    const companyIds = companies.map((c) => c.id);

    if (companyIds.length === 0) {
      return NextResponse.json({ jobs: [], count: 0 });
    }

    const jobs = await prisma.job.findMany({
      where: { companyId: { in: companyIds } },
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: { id: true, name: true },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    const formatted = jobs.map((j) => ({
      ...j,
      applicationCount: j._count.applications,
    }));

    return NextResponse.json({ jobs: formatted, count: formatted.length });
  } catch (error: any) {
    console.error("Employer jobs list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
