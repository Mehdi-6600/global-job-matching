import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { env } from "@/lib/env";

// راه‌اندازی Resend با کلید محیطی
const resend = new Resend(env.RESEND_API_KEY);

// ✅ فقط کاربران لاگین شده اجازه ارسال ایمیل دارند
export async function POST(req: NextRequest) {
  try {
    // 1. بررسی احراز هویت
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "لطفاً وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const { userId, subject, template } = await req.json();

    // 2. کاربر فقط می‌تواند برای خودش ایمیل بفرستد (یا ادمین)
    if (userId !== session.user.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      
      if (user?.role !== "ADMIN" && user?.role !== "OWNER") {
        return NextResponse.json(
          { error: "شما دسترسی ارسال ایمیل برای دیگران را ندارید" },
          { status: 403 }
        );
      }
    }

    // 3. دریافت اطلاعات کاربر گیرنده
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!targetUser?.email) {
      return NextResponse.json(
        { error: "کاربر مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // 4. قالب‌های از پیش تعیین شده (امن)
    const templates: Record<string, { subject: string; html: string }> = {
      "job-alert": {
        subject: "شغل‌های جدید مطابق با سلیقه شما",
        html: `<h1>سلام ${targetUser.name || "کاربر"}</h1>
               <p>شغل‌های جدیدی مطابق با جستجوی شما پیدا شده است.</p>
               <a href="${env.NEXT_PUBLIC_APP_URL}/jobs">مشاهده مشاغل</a>`,
      },
      "welcome": {
        subject: "به Global Job Matching خوش آمدید",
        html: `<h1>سلام ${targetUser.name || "کاربر"}</h1>
               <p>از ثبت‌نام شما در پلتفرم Global Job Matching خوشحالیم.</p>
               <p>برای شروع، پروفایل خود را تکمیل کنید.</p>
               <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard">ورود به داشبورد</a>`,
      },
    };

    // 5. انتخاب قالب (اگر نامعتبر بود، قالب پیش‌فرض)
    const selectedTemplate = templates[template] || templates["welcome"];

    // 6. ارسال ایمیل
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: targetUser.email,
      subject: subject || selectedTemplate.subject,
      html: selectedTemplate.html,
    });

    return NextResponse.json({ success: true, message: "ایمیل با موفقیت ارسال شد" });

  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      { error: "خطا در ارسال ایمیل" },
      { status: 500 }
    );
  }
}
