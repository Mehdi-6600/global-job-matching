import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: {
        id: id,
        status: "active",
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            location: true,
            description: true,
            website: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    await prisma.job.update({
      where: { id: id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error("Job detail fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}
