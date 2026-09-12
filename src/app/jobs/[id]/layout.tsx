import type { Metadata } from "next";
import { db } from "@/lib/db";
import { absoluteUrl, getSiteUrl, truncateMeta } from "@/lib/site-url";
import { normalizeLocation } from "@/lib/location";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const base = getSiteUrl();

  try {
    const job = await db.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        remote: true,
        type: true,
        status: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        updatedAt: true,
        company: { select: { name: true, logo: true } },
      },
    });

    if (!job || job.status !== "active") {
      return {
        title: "Job not found",
        robots: { index: false, follow: false },
      };
    }

    const companyName = job.company?.name || "Company";
    const loc =
      normalizeLocation(job.location) || job.location || (job.remote ? "Remote" : "");
    const title = `${job.title} at ${companyName}`;
    const desc = truncateMeta(
      [
        job.title,
        companyName,
        loc,
        job.remote ? "Remote" : "",
        job.type,
        stripHtml(job.description || ""),
      ]
        .filter(Boolean)
        .join(" — "),
      160
    );

    const url = absoluteUrl(`/jobs/${job.id}`);
    const ogImage = job.company?.logo?.startsWith("http")
      ? job.company.logo
      : absoluteUrl("/og-image.png");

    return {
      title,
      description: desc || `Apply for ${job.title} at ${companyName} on Global Job Matching.`,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        url,
        title,
        description: desc,
        siteName: "Global Job Matching",
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: desc,
        images: [ogImage],
      },
      robots: { index: true, follow: true },
      other: {
        "og:locale": "en_US",
      },
    };
  } catch (error) {
    console.error("Job generateMetadata failed:", error);
    return {
      title: "Job",
      description: "View this job on Global Job Matching.",
      metadataBase: new URL(base),
    };
  }
}

function buildJobPostingJsonLd(job: {
  id: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  deadline: Date | null;
  company: { name: string; logo: string | null; website: string | null } | null;
}): Record<string, unknown> {
  const url = absoluteUrl(`/jobs/${job.id}`);
  const description = stripHtml(job.description || job.title).slice(0, 5000);
  const loc = normalizeLocation(job.location) || job.location || "";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description,
    datePosted: job.createdAt.toISOString(),
    dateModified: job.updatedAt.toISOString(),
    employmentType: (job.type || "FULL_TIME").toUpperCase().replace(/[\s-]+/g, "_"),
    url,
    directApply: true,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company?.name || "Employer",
      sameAs: job.company?.website || undefined,
      logo: job.company?.logo || undefined,
    },
  };

  if (job.deadline) {
    jsonLd.validThrough = job.deadline.toISOString();
  }

  if (job.remote) {
    jsonLd.jobLocationType = "TELECOMMUTE";
    jsonLd.applicantLocationRequirements = {
      "@type": "Country",
      name: "Worldwide",
    };
  }

  if (loc) {
    jsonLd.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: loc,
        addressCountry: undefined,
      },
    };
  }

  if (job.salaryMin != null || job.salaryMax != null) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.currency || "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin ?? undefined,
        maxValue: job.salaryMax ?? undefined,
        unitText: "YEAR",
      },
    };
  }

  return jsonLd;
}

export default async function JobIdLayout({ children, params }: Props) {
  const { id } = await params;
  let jsonLd: Record<string, unknown> | null = null;

  try {
    const job = await db.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        remote: true,
        type: true,
        status: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        deadline: true,
        company: {
          select: { name: true, logo: true, website: true },
        },
      },
    });

    if (job && job.status === "active") {
      jsonLd = buildJobPostingJsonLd(job);
    }
  } catch (error) {
    console.error("Job JSON-LD load failed:", error);
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // Server-rendered structured data for Google JobPosting
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      {children}
    </>
  );
}
