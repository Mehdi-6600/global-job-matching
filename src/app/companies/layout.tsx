import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { DEFAULT_OG_PATH, jsonLdScript } from "@/lib/seo/core";

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Browse companies hiring worldwide on Global Job Matching. Explore profiles and open roles.",
  alternates: {
    canonical: absoluteUrl("/companies"),
  },
  openGraph: {
    title: "Companies | Global Job Matching",
    description: "Browse companies hiring worldwide on Global Job Matching.",
    url: absoluteUrl("/companies"),
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_PATH),
        width: 1200,
        height: 630,
        alt: "Companies on Global Job Matching",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Companies | Global Job Matching",
    description: "Browse companies hiring worldwide on Global Job Matching.",
    images: [absoluteUrl(DEFAULT_OG_PATH)],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const collectionLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Companies",
  description:
    "Companies hiring worldwide on Global Job Matching.",
  url: absoluteUrl("/companies"),
  isPartOf: {
    "@type": "WebSite",
    name: "Global Job Matching",
    url: absoluteUrl("/"),
  },
};

export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(collectionLd) }}
      />
      {children}
    </>
  );
}
