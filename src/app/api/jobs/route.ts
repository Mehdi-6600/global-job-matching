import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAllJobs, fetchJobsByQuery } from "@/lib/jobs/job-apis";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const title = searchParams.get("title") || "";
    const location = searchParams.get("location") || "";
    const source = searchParams.get("source") || "all"; // all, db, external

    // ============================================
    // گزینه ۱: فقط از دیتابیس
    // ============================================
    if (source === "db") {
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

      return NextResponse.json({ jobs: formattedJobs, source: "database" });
    }

    // ============================================
    // گزینه ۲: از APIهای خارجی
    // ============================================
    if (source === "external") {
      const jobs = title
        ? await fetchJobsByQuery(title, location || undefined)
        : await fetchAllJobs();

      return NextResponse.json({ jobs, source: "external" });
    }

    // ============================================
    // گزینه ۳: ترکیبی (دیتابیس + APIهای خارجی)
    // ============================================
    // دریافت از دیتابیس
    const dbJobs = await db.jobListing.findMany({
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

    const formattedDbJobs = dbJobs.map((job) => ({
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

    // دریافت از APIهای خارجی
    const externalJobs = title
      ? await fetchJobsByQuery(title, location || undefined)
      : await fetchAllJobs();

    // ترکیب و حذف تکراری‌ها (بر اساس عنوان و شرکت)
    const allJobs = [...formattedDbJobs, ...externalJobs];
    const uniqueJobs = allJobs.filter(
      (job, index, self) =>
        index === self.findIndex(
          (j) => j.title === job.title && j.company === job.company
        )
    );

    return NextResponse.json({
      jobs: uniqueJobs,
      count: uniqueJobs.length,
      sources: {
        database: formattedDbJobs.length,
        external: externalJobs.length,
      },
    });
  } catch (error) {
    console.error("Jobs API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
