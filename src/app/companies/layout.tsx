import type { Metadata } from "next";
import { absoluteUrl, buildPublicMetadata, jsonLdScript } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "Companies",
  description:
    "Browse companies hiring worldwide on Global Job Matching. Explore profiles and open roles.",
  path: "/companies",
  index: true,
  hreflang: true,
});

const collectionLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Companies",
  description: "Companies hiring worldwide on Global Job Matching.",
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
