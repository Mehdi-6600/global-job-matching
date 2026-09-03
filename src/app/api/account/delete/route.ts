import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const ownerEmail = process.env.OWNER_EMAIL;

    // جلوگیری از حذف حساب مالک سیستم
    if (ownerEmail && userEmail.toLowerCase() === ownerEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "Owner account cannot be deleted." },
        { status: 403 }
      );
    }

    // پاکسازی یکپارچه و همزمان تمامی داده‌های وابسته به کاربر
    await prisma.$transaction([
      prisma.jobAlert.deleteMany({ where: { user: { email: userEmail } } }),
      prisma.application.deleteMany({ where: { applicant: { email: userEmail } } }),
      prisma.user.delete({ where: { email: userEmail } }),
    ]);

    return NextResponse.json(
      { message: "Account deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
