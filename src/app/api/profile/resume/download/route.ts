import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import {
  fetchPrivateResumeBlob,
  isBlobStorageConfigured,
  isHttpUrl,
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
      `resume_dl_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
    }

    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        { error: "Storage not configured", code: "STORAGE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      select: { resumeUrl: true },
    });

    if (!profile?.resumeUrl || !isHttpUrl(profile.resumeUrl)) {
      return NextResponse.json({ error: "No resume found" }, { status: 404 });
    }

    try {
      return await fetchPrivateResumeBlob(profile.resumeUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "BLOB_NOT_FOUND") {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      console.error("Resume download error");
      return NextResponse.json({ error: "Download failed" }, { status: 502 });
    }
  } catch (error) {
    console.error("Resume download route error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
