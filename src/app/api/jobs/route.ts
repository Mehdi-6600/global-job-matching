import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const experience = searchParams.get("experience");
    const remote = searchParams.get("remote");
    const search = searchParams.get("search");

    const where: any = { status: "active" };

    if (category && category !== "All") {
      where.category = { slug: category.toLowerCase() };
    }
    if (type) {
      where.type = type.toLowerCase().replace("-", "-");
    }
    if (experience) {
      where.experience = experience.toLowerCase();
    }
    if (remote === "true") {
      where.remote = true;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
        { tags: { has: search } },
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: { id: true, name: true, logo: true, location: true },
        },
        category: {
          select: { id: true, name: true, slug: true, color: true },
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Jobs GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
