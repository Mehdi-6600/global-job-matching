import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(`companies_${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || "";

    const where: any = { status: { not: "blocked" } };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        jobs: {
          where: { status: "active" },
          select: { id: true },
        },
      },
    });

    const result = companies.map((c) => ({
      ...c,
      activeJobs: c.jobs.length,
    }));

    return NextResponse.json({ companies: result, count: result.length });
  } catch (error: any) {
    console.error("Companies fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}
