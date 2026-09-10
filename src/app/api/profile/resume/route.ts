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
import { rateLimitedResponse } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = await ratelimit.limit(
      `resume_get_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      select: { resumeUrl: true },
    });

    const hasResume = Boolean(profile?.resumeUrl);

    return NextResponse.json({
      hasResume,
      storedInBlob: isHttpUrl(profile?.resumeUrl),
      storageConfigured: isBlobStorageConfigured(),
      downloadPath: hasResume ? "/api/profile/resume/download" : null,
      // Never return the raw blob URL to the client
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
            "File storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel.",
          code: "STORAGE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const ip = getRequestIp(req);
    const limit = await ratelimit.limit(
      `resume_upload_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
    }

    const formData = await req.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (
      file.type !== RESUME_MIME &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > RESUME_MAX_BYTES) {
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
      const msg = error instanceof Error ? error.message : "";
      if (msg === "INVALID_PDF") {
        return NextResponse.json(
          { error: "Only valid PDF files are allowed" },
          { status: 400 }
        );
      }
      if (msg === "FILE_TOO_LARGE") {
        return NextResponse.json(
          { error: "File too large (max 5MB)" },
          { status: 400 }
        );
      }
      console.error("Blob upload failed");
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

    if (existing?.resumeUrl && existing.resumeUrl !== uploaded.url) {
      await deleteResumeIfBlob(existing.resumeUrl);
    }

    return NextResponse.json({
      success: true,
      hasResume: true,
      downloadPath: "/api/profile/resume/download",
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
    const limit = await ratelimit.limit(
      `resume_delete_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
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
