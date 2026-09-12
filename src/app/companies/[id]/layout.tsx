import type { Metadata } from "next";
import { db } from "@/lib/db";
import { absoluteUrl, getSiteUrl, truncateMeta } from "@/lib/site-url";
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
        website: true,
        logo: true,
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
      [company.name, loc, company.description || ""]
        .filter(Boolean)
        .join(" — "),
      160
    );
    const url = absoluteUrl(`/companies/${company.id}`);
    const ogImage =
      company.logo && company.logo.startsWith("http")
        ? company.logo
        : absoluteUrl("/og-image.png");

    return {
      title,
      description:
        desc ||
        `View ${company.name} profile and open jobs on Global Job Matching.`,
      alternates: { canonical: url },
      openGraph: {
        type: "profile",
        url,
        title: `${title} | Global Job Matching`,
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
  let jsonLd: Record<string, unknown> | null = null;

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
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: company.name,
        description: truncateMeta(company.description, 300) || undefined,
        url: absoluteUrl(`/companies/${company.id}`),
        sameAs: company.website || undefined,
        logo: company.logo || undefined,
        address: company.location
          ? {
              "@type": "PostalAddress",
              addressLocality:
                normalizeLocation(company.location) || company.location,
            }
          : undefined,
      };
    }
  } catch (error) {
    console.error("Company JSON-LD load failed:", error);
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      {children}
    </>
  );
}
