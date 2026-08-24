import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

// اعتبارسنجی ورودی‌ها
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // اعتبارسنجی داده‌ها
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر", details: result.error.issues },
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;

    // بررسی تکراری نبودن ایمیل
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "این ایمیل قبلاً ثبت شده است" },
        { status: 409 }
      );
    }

    // هش کردن رمز عبور
    const hashedPassword = await bcrypt.hash(password, 12);

    // ساخت کاربر جدید با نقش JOB_SEEKER (ثابت)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "JOB_SEEKER", // ✅ نقش همیشه جوینده کار است
      },
    });

    // حذف رمز عبور از پاسخ
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { success: true, user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "خطا در ثبت‌نام" },
      { status: 500 }
    );
  }
}
