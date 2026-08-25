import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  type: z.string().max(50).optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());

    const result = querySchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid query", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, search, location, type } = result.data;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) where.title = { contains: search, mode: "insensitive" };
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (type) where.type = type;

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { company: { select: { id: true, name: true, logo: true } } },
      }),
      db.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
