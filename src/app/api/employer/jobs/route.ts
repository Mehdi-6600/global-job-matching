import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { ratelimit } from "@/lib/ratelimit";
import { z } from "zod";

const createJobSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  location: z.string().min(1),
  remote: z.boolean().default(false),
  type: z.string().min(1),
  experience: z.string().min(1),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  currency: z.string().default("USD"),
  requirements: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
  deadline: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role as string) || "jobseeker";
    if (role !== ROLES.EMPLOYER && role !== ROLES.ADMIN && role !== ROLES.OWNER) {
      return NextResponse.json(
        { error: "Only employers can post jobs." },
        { status: 403 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `employer_post_job_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = createJobSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const data = result.data;

    // بررسی مالکیت شرکت
    const company = await prisma.company.findFirst({
      where: {
        ownerId: session.user.id,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "You need to create a company first." },
        { status: 400 }
      );
    }

    const job = await prisma.job.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        remote: data.remote,
        type: data.type,
        experience: data.experience,
        salaryMin: data.salaryMin || null,
        salaryMax: data.salaryMax || null,
        currency: data.currency,
        requirements: data.requirements.filter((r) => r.trim() !== ""),
        responsibilities: data.responsibilities.filter((r) => r.trim() !== ""),
        benefits: data.benefits.filter((b) => b.trim() !== ""),
        tags: data.tags.filter((t) => t.trim() !== ""),
        status: "pending",
        deadline: data.deadline ? new Date(data.deadline) : null,
        companyId: company.id,
        categoryId: data.categoryId || null,
      },
    });

    return NextResponse.json(
      { success: true, job },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Post job error:", error);
    return NextResponse.json(
      { error: "Failed to create job." },
      { status: 500 }
    );
  }
}
