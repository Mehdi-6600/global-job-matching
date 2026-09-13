import {
  absoluteUrl,
  stripHtml,
  toSchemaEmploymentType,
  DEFAULT_OG_PATH,
} from "@/lib/seo/core";
import { normalizeLocation } from "@/lib/location";

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function websiteJsonLd() {
  const base = absoluteUrl("/");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Global Job Matching",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Global Job Matching",
    url: absoluteUrl("/"),
    logo: absoluteUrl(DEFAULT_OG_PATH),
  };
}

/** ItemList for hub pages (locations, categories, job cards) */
export function itemListJsonLd(opts: {
  name: string;
  description?: string;
  path: string;
  items: Array<{ name: string; path: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: opts.name,
    description: opts.description || undefined,
    url: absoluteUrl(opts.path),
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

type JobForLd = {
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
  company: {
    name: string;
    logo: string | null;
    website: string | null;
  } | null;
};

export function jobPostingJsonLd(job: JobForLd): Record<string, unknown> {
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
    employmentType: toSchemaEmploymentType(job.type),
    url,
    directApply: true,
    identifier: {
      "@type": "PropertyValue",
      name: "Global Job Matching",
      value: job.id,
    },
    hiringOrganization: {
      "@type": "Organization",
      name: job.company?.name || "Employer",
      sameAs: job.company?.website || undefined,
      logo: job.company?.logo || undefined,
    },
  };

  if (job.deadline && job.deadline.getTime() > Date.now()) {
    jsonLd.validThrough = job.deadline.toISOString();
  }

  if (job.remote) {
    jsonLd.jobLocationType = "TELECOMMUTE";
  }

  if (loc) {
    jsonLd.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: loc,
      },
    };
  } else if (job.remote) {
    jsonLd.applicantLocationRequirements = {
      "@type": "Country",
      name: "Worldwide",
    };
  }

  if (job.salaryMin != null || job.salaryMax != null) {
    const value: Record<string, unknown> = {
      "@type": "QuantitativeValue",
      unitText: "YEAR",
    };
    if (job.salaryMin != null) value.minValue = job.salaryMin;
    if (job.salaryMax != null) value.maxValue = job.salaryMax;

    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.currency || "USD",
      value,
    };
  }

  return jsonLd;
}

export function companyOrganizationJsonLd(company: {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  website: string | null;
  logo: string | null;
}) {
  const loc = normalizeLocation(company.location) || company.location || "";
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    description: stripHtml(company.description).slice(0, 500) || undefined,
    url: absoluteUrl(`/companies/${company.id}`),
    sameAs: company.website || undefined,
    logo: company.logo || undefined,
    address: loc
      ? {
          "@type": "PostalAddress",
          addressLocality: loc,
        }
      : undefined,
  };
}

export function blogPostingJsonLd(post: {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  coverImage: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description:
      stripHtml(post.excerpt || post.content).slice(0, 300) || undefined,
    datePublished: post.createdAt.toISOString(),
    dateModified: (post.updatedAt || post.createdAt).toISOString(),
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    image:
      post.coverImage && /^https:\/\//i.test(post.coverImage)
        ? post.coverImage
        : absoluteUrl(DEFAULT_OG_PATH),
    author: {
      "@type": "Organization",
      name: "Global Job Matching",
    },
    publisher: {
      "@type": "Organization",
      name: "Global Job Matching",
      url: absoluteUrl("/"),
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(DEFAULT_OG_PATH),
      },
    },
  };
}
