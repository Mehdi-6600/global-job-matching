import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { DEFAULT_OG_PATH, jsonLdScript } from "@/lib/seo/core";

export const metadata: Metadata = {
  title: "Browse Jobs",
  description:
    "Explore active job listings worldwide. Filter by location, remote work, and role on Global Job Matching.",
  alternates: {
    canonical: absoluteUrl("/jobs"),
  },
  openGraph: {
    title: "Browse Jobs | Global Job Matching",
    description:
      "Explore active job listings worldwide on Global Job Matching.",
    url: absoluteUrl("/jobs"),
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_PATH),
        width: 1200,
        height: 630,
        alt: "Browse jobs on Global Job Matching",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Jobs | Global Job Matching",
    description:
      "Explore active job listings worldwide on Global Job Matching.",
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
  name: "Browse Jobs",
  description:
    "Active job listings worldwide on Global Job Matching.",
  url: absoluteUrl("/jobs"),
  isPartOf: {
    "@type": "WebSite",
    name: "Global Job Matching",
    url: absoluteUrl("/"),
  },
};

export default function JobsLayout({
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
