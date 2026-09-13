import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  absoluteUrl,
  getSiteUrl,
  truncateMeta,
  stripHtml,
  jsonLdScript,
} from "@/lib/seo/core";
import { buildHreflangLanguages } from "@/lib/seo/hreflang";
import { jobPostingJsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { jobBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { normalizeLocation } from "@/lib/location";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

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
        company: { select: { id: true, name: true, logo: true } },
      },
    });

    if (!job) {
      return {
        title: "Job not found",
        robots: { index: false, follow: false },
      };
    }

    const companyName = job.company?.name || "Company";
    const loc =
      normalizeLocation(job.location) ||
      job.location ||
      (job.remote ? "Remote" : "");
    const isActive = job.status === "active";
    const title = isActive
      ? `${job.title} at ${companyName}`
      : `${job.title} at ${companyName} (Closed)`;
    const desc = truncateMeta(
      [
        isActive ? null : "This listing is no longer active.",
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

    const path = `/jobs/${job.id}`;
    const url = absoluteUrl(path);
    const ogImage =
      job.company?.logo && /^https:\/\//i.test(job.company.logo)
        ? job.company.logo
        : absoluteUrl(`/jobs/${job.id}/opengraph-image`);

    return {
      title,
      description:
        desc ||
        `Job listing for ${job.title} at ${companyName} on Global Job Matching.`,
      alternates: {
        canonical: url,
        languages: buildHreflangLanguages(path),
      },
      openGraph: {
        type: "article",
        url,
        title,
        description: desc,
        siteName: "Global Job Matching",
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: desc,
        images: [ogImage],
      },
      // Closed jobs: keep URL for users/links, do not push as active job index
      robots: isActive
        ? { index: true, follow: true }
        : { index: false, follow: true },
    };
  } catch (error) {
    console.error("Job generateMetadata failed:", error);
    return {
      title: "Job",
      description: "Job listing on Global Job Matching.",
      metadataBase: new URL(base),
    };
  }
}

export default async function JobIdLayout({ children, params }: Props) {
  const { id } = await params;
  const scripts: string[] = [];

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
          select: {
            id: true,
            name: true,
            logo: true,
            website: true,
            location: true,
          },
        },
      },
    });

    // JobPosting only for active listings — never emit invalid active-job schema
    if (job && job.status === "active") {
      scripts.push(
        jsonLdScript(
          jobPostingJsonLd({
            id: job.id,
            title: job.title,
            description: job.description || job.title,
            location: job.location || "",
            remote: job.remote,
            type: job.type,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            currency: job.currency || "USD",
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            deadline: job.deadline,
            company: job.company
              ? {
                  name: job.company.name,
                  logo: job.company.logo,
                  website: job.company.website,
                }
              : null,
          })
        )
      );
      scripts.push(
        jsonLdScript(
          breadcrumbJsonLd(
            jobBreadcrumbs({
              jobTitle: job.title,
              jobId: job.id,
              companyName: job.company?.name,
              companyId: job.company?.id,
            })
          )
        )
      );
    } else if (job) {
      scripts.push(
        jsonLdScript(
          breadcrumbJsonLd(
            jobBreadcrumbs({
              jobTitle: job.title,
              jobId: job.id,
              companyName: job.company?.name,
              companyId: job.company?.id,
            })
          )
        )
      );
    }
  } catch (error) {
    console.error("Job JSON-LD load failed:", error);
  }

  return (
    <>
      {scripts.map((html, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ))}
      {children}
    </>
  );
}
