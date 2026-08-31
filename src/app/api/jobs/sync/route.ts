import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchFromArbeitnow } from "@/lib/jobs/fetcher";
import { env } from "@/lib/env";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";

function parseLocation(location: string): {
  city: string;
  country: string;
} {
  if (!location) {
    return {
      city: "Remote",
      country: "Remote",
    };
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      city: parts[0],
      country: parts[parts.length - 1],
    };
  }

  return {
    city: location,
    country: location,
  };
}

function mapJobType(apiType: string): string {
  const type = apiType.toLowerCase();

  if (type.includes("full")) {
    return "full-time";
  }

  if (type.includes("part")) {
    return "part-time";
  }

  if (type.includes("contract")) {
    return "contract";
  }

  if (type.includes("freelance")) {
    return "freelance";
  }

  if (type.includes("intern")) {
    return "internship";
  }

  return "full-time";
}

function stripHtml(html: string): string {
  if (!html) {
    return "";
  }

  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedBearerSecret(request, env.SYNC_SECRET)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const jobs = await fetchFromArbeitnow({
      page: 1,
      perPage: 100,
    });

    let created = 0;
    let skipped = 0;

    for (const job of jobs) {
      const { city, country } = parseLocation(job.location);

      const jobType = mapJobType(
        job.job_types?.[0] || "full_time"
      );

      let company = await db.company.findFirst({
        where: {
          name: job.company_name,
        },
      });

      if (!company) {
        const slug =
          generateSlug(job.company_name) ||
          `company-${Date.now()}`;

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

      await db.job.create({
        data: {
          title: job.title,
          description:
            stripHtml(job.description) || job.title,
          location: `${city}, ${country}`,
          remote: job.remote ?? false,
          type: jobType,
          experience: "mid",
          currency: "USD",
          requirements: job.tags || [],
          responsibilities: [],
          benefits: [],
          tags: [
            ...(job.tags || []),
            job.url,
          ],
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

    return NextResponse.json(
      {
        error: "Sync failed",
      },
      {
        status: 500,
      }
    );
  }
}
