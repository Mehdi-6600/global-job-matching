import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchFromArbeitnow } from "@/lib/jobs/fetcher";
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
  if (t.includes("full")) return "full-time";
  if (t.includes("part")) return "part-time";
  if (t.includes("contract")) return "contract";
  if (t.includes("freelance")) return "freelance";
  if (t.includes("intern")) return "internship";
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

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await fetchFromArbeitnow({ page: 1, perPage: 100 });
    let created = 0;
    let skipped = 0;

    for (const job of jobs) {
      const { city, country } = parseLocation(job.location);
      const jobType = mapJobType(job.job_types?.[0] || "full_time");

      let company = await prisma.company.findFirst({
        where: { name: job.company_name },
      });

      if (!company) {
        const slug = generateSlug(job.company_name) || `company-${Date.now()}`;
        company = await prisma.company.create({
          data: {
            name: job.company_name,
            slug,
            email: env.OWNER_EMAIL,
            location: job.location || "Remote",
            status: "verified",
          },
        });
      }

      const existing = await prisma.job.findFirst({
        where: {
          OR: [
            { title: job.title, companyId: company.id },
            { tags: { has: job.url } },
          ],
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.job.create({
        data: {
          title: job.title,
          description: stripHtml(job.description) || job.title,
          location: `${city}, ${country}`,
          remote: job.remote ?? false,
          type: jobType,
          experience: "mid",
          currency: "USD",
          requirements: job.tags || [],
          responsibilities: [],
          benefits: [],
          tags: [...(job.tags || []), job.url],
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
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
