import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAllJobs } from "@/lib/jobs/fetcher";
import { env } from "@/lib/env";

function parseLocation(location: string): { city: string; country: string } {
  if (!location) return { city: "Remote", country: "Remote" };
  const parts = location.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] };
  }
  return { city: location, country: location };
}

function mapJobType(apiType: string): string {
  const t = apiType.toLowerCase();
  if (t.includes("full")) return "FULL_TIME";
  if (t.includes("part")) return "PART_TIME";
  if (t.includes("contract")) return "CONTRACT";
  if (t.includes("freelance")) return "FREELANCE";
  if (t.includes("intern")) return "INTERNSHIP";
  return "FULL_TIME";
}

export async function GET(request: NextRequest) {
  // Simple secret-based auth for manual triggering from phone
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find owner user to act as the employer for API-sourced jobs
    const owner = await db.user.findFirst({
      where: { email: env.OWNER_EMAIL },
      select: { id: true },
    });

    const employerId = owner?.id || "system";

    const { jobs } = await fetchAllJobs({ page: 1, perPage: 100 });
    let created = 0;
    let skipped = 0;

    for (const job of jobs) {
      const { city, country } = parseLocation(job.location);
      const jobType = mapJobType(job.job_types?.[0] || "full_time");

      // Avoid duplicates by externalUrl
      const existing = await db.jobListing.findFirst({
        where: { externalUrl: job.url },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.jobListing.create({
        data: {
          employerId,
          title: job.title,
          description: job.description || job.title,
          skillsRequired: job.tags || [],
          jobType: jobType as any,
          status: "ACTIVE",
          country,
          city,
          isRemote: job.remote ?? false,
          salaryCurrency: "USD",
          salaryPeriod: "yearly",
          contactName: job.company_name || "Unknown",
          contactEmail: env.OWNER_EMAIL,
          source: "arbeitnow",
          externalId: job.slug || null,
          externalUrl: job.url,
        },
      });

      created++;
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      totalFetched: jobs.length,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
