import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchFromArbeitnow } from "@/lib/jobs/fetcher";
import { env } from "@/lib/env";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";
import {
  parseLocation,
  mapJobType,
  stripHtml,
  generateSlug,
  guessCurrency,
  guessExperience,
} from "@/lib/jobs/sync-normalize";

function isAuthorized(request: NextRequest): boolean {
  if (isAuthorizedBearerSecret(request, env.SYNC_SECRET)) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && isAuthorizedBearerSecret(request, cronSecret)) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await fetchFromArbeitnow({
      page: 1,
      perPage: 100,
    });

    let created = 0;
    let skipped = 0;

    for (const job of jobs) {
      const { city, country } = parseLocation(job.location || "");
      const jobType = mapJobType(job.job_types?.[0] || "full_time");
      const plainDescription = stripHtml(job.description || "") || job.title;
      const currency = guessCurrency(job.location || "", country);
      const experience = guessExperience(
        job.title || "",
        job.tags || [],
        plainDescription
      );

      let company = await db.company.findFirst({
        where: { name: job.company_name },
      });

      if (!company) {
        const slug =
          generateSlug(job.company_name) || `company-${Date.now()}`;

        company = await db.company.create({
          data: {
            name: job.company_name,
            slug,
            email: env.OWNER_EMAIL,
            location: job.location || "Remote",
            status: "verified",
          },
        });
      }

      const existing = await db.job.findFirst({
        where: {
          OR: [
            {
              title: job.title,
              companyId: company.id,
            },
            {
              tags: {
                has: job.url,
              },
            },
          ],
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const sourceTags = [
        ...(job.tags || []),
        job.url,
        "source:arbeitnow",
        `synced:${new Date().toISOString().slice(0, 10)}`,
      ];

      await db.job.create({
        data: {
          title: job.title,
          description: plainDescription,
          location: `${city}, ${country}`,
          remote: job.remote ?? false,
          type: jobType,
          experience,
          currency,
          requirements: job.tags || [],
          responsibilities: [],
          benefits: [],
          tags: sourceTags,
          status: "active",
          companyId: company.id,
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
  } catch (error) {
    console.error("Sync error:", error);

    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
