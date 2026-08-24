import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const type = searchParams.get("type") || "";
    const experience = searchParams.get("experience") || "";
    const remote = searchParams.get("remote");
    const salaryMin = searchParams.get("salaryMin");
    const salaryMax = searchParams.get("salaryMax");
    const postedWithin = searchParams.get("postedWithin");
    const sortBy = searchParams.get("sortBy") || "newest";
    const companyId = searchParams.get("company");

    const where: any = { status: "active" };

    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (category) {
      where.category = { name: { equals: category, mode: "insensitive" } };
    }

    if (type) {
      where.type = { equals: type, mode: "insensitive" };
    }

    if (experience) {
      where.experience = { equals: experience, mode: "insensitive" };
    }

    if (remote === "true") {
      where.remote = true;
    }

    if (salaryMin || salaryMax) {
      where.AND = [];
      if (salaryMin) {
        where.AND.push({ salaryMax: { gte: Number(salaryMin) } });
      }
      if (salaryMax) {
        where.AND.push({ salaryMin: { lte: Number(salaryMax) } });
      }
    }

    if (postedWithin) {
      const days = Number(postedWithin);
      const date = new Date();
      date.setDate(date.getDate() - days);
      where.createdAt = { gte: date };
    }

    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "salary-high") {
      orderBy = { salaryMax: "desc" };
    } else if (sortBy === "salary-low") {
      orderBy = { salaryMin: "asc" };
    } else if (sortBy === "oldest") {
      orderBy = { createdAt: "asc" };
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      include: {
        company: {
          select: { id: true, name: true, logo: true, location: true },
        },
        category: {
          select: { id: true, name: true, slug: true, color: true },
        },
      },
    });

    return NextResponse.json({ jobs, count: jobs.length });
  } catch (error: any) {
    console.error("Jobs fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
