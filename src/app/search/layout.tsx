import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/core";

/**
 * Clean /search can be lightly indexed; filtered query URLs are noindex via middleware.
 */
export const metadata: Metadata = buildPublicMetadata({
  title: "Search jobs",
  description:
    "Search global job listings by keyword, location, and remote options on Global Job Matching.",
  path: "/search",
  index: true,
  hreflang: true,
});

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
