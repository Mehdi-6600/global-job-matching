import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";

const applySchema = z.object({
  jobId: z.string().min(1),
  coverLetter: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. بررسی لاگین
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // 2. Rate limit: 10 درخواست در ساعت برای هر کاربر
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `apply_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many applications. Please try again later." },
        { status: 429 }
      );
    }

    // 3. اعتبارسنجی ورودی
    const body = await req.json();
    const result = applySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { jobId, coverLetter } = result.data;

    // 4. بررسی وجود و فعال بودن شغل
    const job = await prisma.job.findUnique({
      where: { id: jobId, status: "active" },
    });
    if (!job) {
      return NextResponse.json(
        { error: "Job not found or no longer active." },
        { status: 404 }
      );
    }

    // 5. ثبت درخواست (اگر تکراری باشد، Prisma خطای P2002 می‌دهد)
    const application = await prisma.application.create({
      data: {
        userId: session.user.id,
        jobId: jobId,
        coverLetter: coverLetter || null,
        status: "applied",
      },
    });

    // 6. افزایش شمارنده متقاضیان شغل
    await prisma.job.update({
      where: { id: jobId },
      data: { applicantCount: { increment: 1 } },
    });

    return NextResponse.json(
      { success: true, application },
      { status: 201 }
    );
  } catch (error: any) {
    // ❗ جلوگیری از درخواست تکراری — خطای Prisma P2002
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "You have already applied for this job." },
        { status: 409 }
      );
    }

    console.error("Application error:", error);
    return NextResponse.json(
      { error: "Failed to submit application." },
      { status: 500 }
    );
  }
}
