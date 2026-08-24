import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get companies owned by this user (by email match)
    const companies = await prisma.company.findMany({
      where: { email: session.user.email || "" },
      select: { id: true },
    });

    const companyIds = companies.map((c) => c.id);

    const jobs = await prisma.job.findMany({
      where: { companyId: { in: companyIds } },
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: { id: true, name: true, logo: true },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error("Employer jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
