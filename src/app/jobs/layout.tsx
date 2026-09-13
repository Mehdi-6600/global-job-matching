import type { Metadata } from "next";
import { absoluteUrl, buildPublicMetadata, jsonLdScript } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "Browse Jobs",
  description:
    "Explore active job listings worldwide. Filter by location, remote work, and role on Global Job Matching.",
  path: "/jobs",
  index: true,
  hreflang: true,
});

const collectionLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Browse Jobs",
  description: "Active job listings worldwide on Global Job Matching.",
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
