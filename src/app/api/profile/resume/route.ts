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

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    let resumeUrl = safeName;

    // Optional: Vercel Blob when token is configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(
          `resumes/${session.user.id}/${Date.now()}-${safeName}`,
          file,
          {
            access: "public",
            contentType: "application/pdf",
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }
        );
        resumeUrl = blob.url;
      } catch (blobErr) {
        console.error("Blob upload failed, saving filename only:", blobErr);
        resumeUrl = safeName;
      }
    }

    await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        resumeUrl,
      },
      update: {
        resumeUrl,
      },
    });

    return NextResponse.json({
      success: true,
      filename: safeName,
      resumeUrl,
      storedInBlob: resumeUrl.startsWith("http"),
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

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { resumeUrl: true },
    });

    if (
      profile?.resumeUrl &&
      profile.resumeUrl.startsWith("http") &&
      process.env.BLOB_READ_WRITE_TOKEN
    ) {
      try {
        const { del } = await import("@vercel/blob");
        await del(profile.resumeUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (delErr) {
        console.error("Blob delete failed:", delErr);
      }
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
