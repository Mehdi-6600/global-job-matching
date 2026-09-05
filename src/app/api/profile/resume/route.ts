import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import {
  RESUME_MAX_BYTES,
  RESUME_MIME,
  deleteResumeIfBlob,
  isBlobStorageConfigured,
  isHttpUrl,
  uploadResumePdf,
} from "@/lib/storage/resume";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `resume_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      select: { resumeUrl: true },
    });

    const resumeUrl = profile?.resumeUrl || null;

    return NextResponse.json({
      resumeUrl,
      hasResume: Boolean(resumeUrl),
      storedInBlob: isHttpUrl(resumeUrl),
      storageConfigured: isBlobStorageConfigured(),
    });
  } catch (error) {
    console.error("Resume GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        {
          error:
            "File storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel environment variables.",
          code: "STORAGE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `resume_upload_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== RESUME_MIME && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > RESUME_MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    const existing = await db.profile.findUnique({
      where: { userId: session.user.id },
      select: { resumeUrl: true },
    });

    let uploaded: { url: string; pathname: string };
    try {
      uploaded = await uploadResumePdf({
        userId: session.user.id,
        file,
        filename: file.name || "resume.pdf",
      });
    } catch (error) {
      console.error("Blob upload failed:", error);
      return NextResponse.json(
        {
          error: "Failed to store file. Check BLOB_READ_WRITE_TOKEN.",
          code: "BLOB_UPLOAD_FAILED",
        },
        { status: 502 }
      );
    }

    await db.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        resumeUrl: uploaded.url,
      },
      update: {
        resumeUrl: uploaded.url,
      },
    });

    // Best-effort cleanup of previous blob
    if (existing?.resumeUrl && existing.resumeUrl !== uploaded.url) {
      await deleteResumeIfBlob(existing.resumeUrl);
    }

    return NextResponse.json({
      success: true,
      resumeUrl: uploaded.url,
      storedInBlob: true,
      message: "Resume uploaded successfully",
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `resume_delete_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      select: { resumeUrl: true },
    });

    await db.profile.updateMany({
      where: { userId: session.user.id },
      data: { resumeUrl: null },
    });

    await deleteResumeIfBlob(profile?.resumeUrl);

    return NextResponse.json({
      success: true,
      message: "Resume removed",
    });
  } catch (error) {
    console.error("Resume delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
