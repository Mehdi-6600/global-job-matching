import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files allowed" },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 2MB)" },
        { status: 400 }
      );
    }

    // فعلاً فقط نام فایل را ذخیره می‌کنیم
    // (برای ذخیره واقعی فایل بعداً می‌توان از Vercel Blob / S3 استفاده کرد)
    await prisma.profile.updateMany({
      where: { userId: session.user.id },
      data: {
        resumeUrl: file.name,
      },
    });

    return NextResponse.json({
      message: "Resume uploaded",
      filename: file.name,
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.profile.updateMany({
    where: { userId: session.user.id },
    data: {
      resumeUrl: null,
    },
  });

  return NextResponse.json({ message: "Resume deleted" });
}
