import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    // Store filename only for now (no blob storage yet)
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        resumeUrl: filename,
      },
      update: {
        resumeUrl: filename,
      },
    });

    return NextResponse.json({
      success: true,
      filename,
      message:
        "Resume filename saved. For production, connect S3/Blob storage.",
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.profile.updateMany({
      where: { userId: session.user.id },
      data: { resumeUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resume delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
