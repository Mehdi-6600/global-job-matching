import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role as string) || "jobseeker";
    if (
      role !== ROLES.EMPLOYER &&
      role !== ROLES.ADMIN &&
      role !== ROLES.OWNER
    ) {
      return NextResponse.json(
        { error: "Only employers can access this." },
        { status: 403 }
      );
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `employer_companies_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const companies = await prisma.company.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        location: true,
        logo: true,
        status: true,
      },
    });

    return NextResponse.json({ companies, count: companies.length });
  } catch (error: unknown) {
    console.error("Employer companies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}
