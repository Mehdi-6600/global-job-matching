import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeLocation } from "@/lib/location";
import { createJobForUser } from "@/services/jobs/create-job";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";

/**
 * Legacy path — must not bypass plan or ownership checks.
 * Prefer: POST /api/employer/jobs
 *
 * این مسیر قدیمی است و صرفاً برای سازگاری عقب‌رو نگه داشته شده.
 * تمام بررسی‌های پلن، مالکیت و محدودیت‌ها از طریق createJobForUser اعمال می‌شود.
 */

// نوع پاسخ خطای ساختاریافته
type JobCreateErrorResponse = {
  error: string;
  code?: string;
  details?: unknown;
  limit?: number;
  used?: number;
};

// نوع بدنه‌ی درخواست (به‌صورت اختیاری قابل گسترش است)
type JobCreateRequestBody = Record<string, unknown>;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1) احراز هویت
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<JobCreateErrorResponse>(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2) محدودیت نرخ درخواست بر اساس کاربر + IP
    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `jobs_create_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json<JobCreateErrorResponse>(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // 3) تجزیه‌ی امن بدنه‌ی JSON
    let body: JobCreateRequestBody;
    try {
      body = (await req.json()) as JobCreateRequestBody;
    } catch {
      return NextResponse.json<JobCreateErrorResponse>(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // 4) اعتبارسنجی سبک ورودی (در صورت نیاز می‌توان از Zod استفاده کرد)
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json<JobCreateErrorResponse>(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // 5) ایجاد شغل با اعمال تمام بررسی‌های پلن و مالکیت
    const result = await createJobForUser(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
      },
      body
    );

    // 6) مدیریت خطای سرویس
    if (!result.ok) {
      return NextResponse.json<JobCreateErrorResponse>(
        {
          error: result.error,
          code: result.code,
          details: result.details,
          limit: result.limit,
          used: result.used,
        },
        { status: result.status }
      );
    }

    // 7) پاسخ موفق با نرمال‌سازی مکان
    const job = result.job;
    return NextResponse.json({
      success: true,
      job: {
        ...job,
        location: normalizeLocation(job.location) || job.location,
      },
    });
  } catch (error) {
    // 8) لاگ‌گیری و پاسخ خطای عمومی
    console.error("[jobs-create-route] Job create error:", error);
    return NextResponse.json<JobCreateErrorResponse>(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
