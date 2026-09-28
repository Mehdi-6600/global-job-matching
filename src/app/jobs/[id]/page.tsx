import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildPublicMetadata,
  jsonLdScript,
  stripHtml,
  toSchemaEmploymentType,
} from "@/lib/seo/core";
import { jobIdSchema } from "@/lib/validation/job-id";
import JobDetailClient, { type JobDetail } from "./JobDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getPublicJob(id: string) {
  const parsed = jobIdSchema.safeParse(id);

  if (!parsed.success) {
    return null;
  }

  return db.job.findUnique({
    where: { id: parsed.data },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
          location: true,
          description: true,
          website: true,
          ownerId: true,
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
}

function toClientJob(
  job: NonNullable<Awaited<ReturnType<typeof getPublicJob>>>,
): JobDetail {
  const company = job.company
    ? {
        id: job.company.id,
        name: job.company.name,
        logo: job.company.logo,
        location: job.company.location,
        description: job.company.description,
        website: job.company.website,
      }
    : null;

  return {
    ...job,
    createdAt: job.createdAt.toISOString(),
    deadline: job.deadline ? job.deadline.toISOString() : null,
    company,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getPublicJob(id);

  if (!job || job.status !== "active") {
    return {
      title: "Job not found",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const companyName =
    job.company?.name || "Global Job Matching";

  const description =
    stripHtml(job.description) ||
    `View the ${job.title} job opportunity at ${companyName} on Global Job Matching.`;

  return buildPublicMetadata({
    title: `${job.title} | ${companyName}`,
    description,
    path: `/jobs/${job.id}`,
    index: true,
    hreflang: true,
    type: "website",
  });
}

export default async function JobDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const job = await getPublicJob(id);

  if (!job || job.status !== "active") {
    notFound();
  }

  const clientJob = toClientJob(job);

  const companyName =
    job.company?.name || "Global Job Matching";

  const siteUrl = getSiteUrl().replace(/\/$/, "");

  const description =
    stripHtml(job.description) || job.title;

  const jobPosting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",

    title: job.title,

    description,

    datePosted: (
      job.publishedAt ||
      job.createdAt
    ).toISOString(),

    ...(job.deadline
      ? {
          validThrough:
            job.deadline.toISOString(),
        }
      : {}),

    employmentType: toSchemaEmploymentType(
      job.type,
    ),

    hiringOrganization: {
      "@type": "Organization",
      name: companyName,

      ...(job.company?.website
        ? {
            sameAs: job.company.website,
          }
        : {}),

      ...(job.company?.logo
        ? {
            logo: job.company.logo,
          }
        : {}),
    },

    url: `${siteUrl}/jobs/${job.id}`,

    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
      },
    },

    ...(job.remote
      ? {
          jobLocationType: "TELECOMMUTE",
        }
      : {}),

    ...(job.salaryMin != null ||
    job.salaryMax != null
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.currency || "USD",
            value: {
              "@type": "QuantitativeValue",

              ...(job.salaryMin != null
                ? {
                    minValue: job.salaryMin,
                  }
                : {}),

              ...(job.salaryMax != null
                ? {
                    maxValue: job.salaryMax,
                  }
                : {}),
            },
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(jobPosting),
        }}
      />

      <JobDetailClient
        initialJob={clientJob}
      />
    </>
  );
}
