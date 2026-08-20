import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const title = searchParams.get("title") || "";
    const location = searchParams.get("location") || "";

    // دریافت مشاغل از دیتابیس
    const jobs = await db.jobListing.findMany({
      where: {
        status: "ACTIVE",
        ...(title && {
          title: {
            contains: title,
            mode: "insensitive",
          },
        }),
        ...(location && {
          OR: [
            { city: { contains: location, mode: "insensitive" } },
            { country: { contains: location, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // تبدیل به فرمت مورد نیاز
    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.contactName || "Unknown Company",
      location: job.isRemote ? "Remote" : `${job.city}, ${job.country}`,
      salary: job.salaryMin && job.salaryMax
        ? `$${job.salaryMin} - $${job.salaryMax} ${job.salaryCurrency}`
        : undefined,
      description: job.description,
      url: "#",
      source: job.source || "direct",
      postedAt: job.createdAt,
    }));

    return NextResponse.json({ jobs: formattedJobs });
  } catch (error) {
    console.error("Jobs API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
