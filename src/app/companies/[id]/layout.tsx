import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  absoluteUrl,
  getSiteUrl,
  truncateMeta,
  stripHtml,
  jsonLdScript,
  DEFAULT_OG_PATH,
} from "@/lib/seo/core";
import { buildHreflangLanguages } from "@/lib/seo/hreflang";
import {
  companyOrganizationJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo/json-ld";
import { companyBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { normalizeLocation } from "@/lib/location";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const base = getSiteUrl();

  try {
    const company = await db.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        logo: true,
        website: true,
        status: true,
      },
    });

    if (!company || company.status !== "active") {
      return {
        title: "Company not found",
        robots: { index: false, follow: false },
      };
    }

    const loc = normalizeLocation(company.location) || company.location || "";
    const title = company.name;
    const desc = truncateMeta(
      stripHtml(company.description) ||
        `${company.name}${loc ? ` — ${loc}` : ""} on Global Job Matching.`,
      160
    );
    const path = `/companies/${company.id}`;
    const url = absoluteUrl(path);
    const ogImage =
      company.logo && /^https:\/\//i.test(company.logo)
        ? company.logo
        : absoluteUrl(DEFAULT_OG_PATH);

    return {
      title,
      description: desc,
      alternates: {
        canonical: url,
        languages: buildHreflangLanguages(path),
      },
      openGraph: {
        type: "profile",
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
    };
  } catch (error) {
    console.error("Company generateMetadata failed:", error);
    return {
      title: "Company",
      description: "Company profile on Global Job Matching.",
      metadataBase: new URL(base),
    };
  }
}

export default async function CompanyIdLayout({ children, params }: Props) {
  const { id } = await params;
  const scripts: string[] = [];

  try {
    const company = await db.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        website: true,
        logo: true,
        status: true,
      },
    });

    if (company && company.status === "active") {
      scripts.push(jsonLdScript(companyOrganizationJsonLd(company)));
      scripts.push(
        jsonLdScript(
          breadcrumbJsonLd(
            companyBreadcrumbs({
              companyName: company.name,
              companyId: company.id,
            })
          )
        )
      );
    }
  } catch (error) {
    console.error("Company JSON-LD load failed:", error);
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
