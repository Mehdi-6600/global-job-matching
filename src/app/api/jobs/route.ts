import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(12),
  search: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  type: z.string().max(50).optional(),
  experience: z.string().max(50).optional(),
  remote: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  minSalary: z.coerce.number().optional(),
  maxSalary: z.coerce.number().optional(),
  tag: z.string().max(50).optional(),
  company: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());

    const result = querySchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid query",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      search,
      location,
      type,
      experience,
      remote,
      minSalary,
      maxSalary,
      tag,
      company,
    } = result.data;

    const skip = (page - 1) * limit;

    const where: any = { status: "active" };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }
    if (type) where.type = type;
    if (experience) where.experience = experience;
    if (remote) where.remote = true;
    if (company) where.companyId = company;
    if (tag) where.tags = { has: tag };
    if (minSalary !== undefined || maxSalary !== undefined) {
      where.AND = where.AND || [];
      if (minSalary !== undefined) {
        where.AND.push({
          OR: [{ salaryMax: { gte: minSalary } }, { salaryMax: null }],
        });
      }
      if (maxSalary !== undefined) {
        where.AND.push({
          OR: [{ salaryMin: { lte: maxSalary } }, { salaryMin: null }],
        });
      }
    }

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: {
            select: { id: true, name: true, logo: true, location: true },
          },
          category: { select: { name: true, slug: true } },
        },
      }),
      db.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
