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
    return { city: "Remote", country: "Remote" };
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

  if (type.includes("full")) return "full-time";
  if (type.includes("part")) return "part-time";
  if (type.includes("contract")) return "contract";
  if (type.includes("freelance")) return "freelance";
  if (type.includes("intern")) return "internship";

  return "full-time";
}

function stripHtml(html: string): string {
  if (!html) return "";
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

/** Guess currency from location/country text (not a forex API). */
function guessCurrency(location: string, country: string): string {
  const text = `${location} ${country}`.toLowerCase();

  if (
    text.includes("germany") ||
    text.includes("france") ||
    text.includes("netherlands") ||
    text.includes("spain") ||
    text.includes("italy") ||
    text.includes("austria") ||
    text.includes("belgium") ||
    text.includes("ireland") ||
    text.includes("euro") ||
    text.includes("berlin") ||
    text.includes("munich") ||
    text.includes("amsterdam") ||
    text.includes("paris")
  ) {
    return "EUR";
  }

  if (
    text.includes("united kingdom") ||
    text.includes("uk") ||
    text.includes("england") ||
    text.includes("london") ||
    text.includes("scotland")
  ) {
    return "GBP";
  }

  if (text.includes("switzerland") || text.includes("zurich")) {
    return "CHF";
  }

  if (
    text.includes("canada") ||
    text.includes("toronto") ||
    text.includes("vancouver")
  ) {
    return "CAD";
  }

  if (
    text.includes("australia") ||
    text.includes("sydney") ||
    text.includes("melbourne")
  ) {
    return "AUD";
  }

  if (
    text.includes("india") ||
    text.includes("bangalore") ||
    text.includes("mumbai")
  ) {
    return "INR";
  }

  if (text.includes("japan") || text.includes("tokyo")) {
    return "JPY";
  }

  if (
    text.includes("united states") ||
    text.includes("usa") ||
    text.includes("new york") ||
    text.includes("san francisco") ||
    text.includes("remote")
  ) {
    return "USD";
  }

  return "USD";
}

/** Infer seniority from title + tags + description snippet. */
function guessExperience(
  title: string,
  tags: string[] = [],
  description: string = ""
): string {
  const text = `${title} ${tags.join(" ")} ${description}`
    .toLowerCase()
    .slice(0, 2000);

  if (
    text.includes("intern") ||
    text.includes("internship") ||
    text.includes("entry-level") ||
    text.includes("entry level") ||
    text.includes("junior") ||
    text.includes("graduate")
  ) {
    return "entry";
  }

  if (
    text.includes("senior") ||
    text.includes("sr.") ||
    text.includes("staff ") ||
    text.includes("principal") ||
    text.includes("lead ") ||
    text.includes("head of")
  ) {
    return "senior";
  }

  if (
    text.includes("mid-level") ||
    text.includes("mid level") ||
    text.includes("intermediate")
  ) {
    return "mid";
  }

  return "mid";
}

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
