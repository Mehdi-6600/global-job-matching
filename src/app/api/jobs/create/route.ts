import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const jobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  location: z.string().min(2),
  remote: z.boolean().optional(),
  type: z.string().min(1),
  experience: z.string().min(1),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
  currency: z.string().default("USD"),
  requirements: z.array(z.string()).optional().default([]),
  responsibilities: z.array(z.string()).optional().default([]),
  benefits: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  companyId: z.string().optional(),
  categoryId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. بررسی احراز هویت
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in to create a job" },
        { status: 401 }
      );
    }

    // 2. دریافت اطلاعات کاربر
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 3. بررسی نقش کاربر (فقط EMPLOYER یا ADMIN یا OWNER)
    const allowedRoles = ["EMPLOYER", "ADMIN", "OWNER"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Only employers can create job listings" },
        { status: 403 }
      );
    }

    // 4. اعتبارسنجی داده‌های ورودی
    const body = await req.json();
    const result = jobSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid job data", details: result.error.issues },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      location,
      remote,
      type,
      experience,
      salaryMin,
      salaryMax,
      currency,
      requirements,
      responsibilities,
      benefits,
      tags,
      companyId,
      categoryId,
    } = result.data;

    // 5. تعیین CompanyId
    let finalCompanyId = companyId;

    if (!finalCompanyId) {
      // بررسی آیا کاربر صاحب یک شرکت است یا خیر
      const userCompany = await prisma.company.findFirst({
        where: { 
          // برای سادگی، فرض می‌کنیم کاربر با email صاحب شرکت است
          // در آینده بهتر است از ownerId استفاده کنید
          email: session.user.email || undefined,
        },
        select: { id: true },
      });

      if (userCompany) {
        finalCompanyId = userCompany.id;
      } else {
        // اگر شرکت نداشت، اجازه ساخت شغل داده نشود
        return NextResponse.json(
          { error: "You must have a company to post a job. Please create a company first." },
          { status: 400 }
        );
      }
    }

    // 6. بررسی وجود شرکت
    const company = await prisma.company.findUnique({
      where: { id: finalCompanyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // 7. ساخت شغل با وضعیت "pending" (نیاز به تأیید)
    const job = await prisma.job.create({
      data: {
        title,
        description,
        location,
        remote: remote || false,
        type,
        experience,
        salaryMin: salaryMin || null,
        salaryMax: salaryMax || null,
        currency: currency || "USD",
        requirements,
        responsibilities,
        benefits,
        tags,
        status: "pending", // ✅ وضعیت در انتظار تأیید
        companyId: finalCompanyId,
        categoryId: categoryId || null,
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        job,
        message: "Job created successfully and is pending review" 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Job creation error:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
