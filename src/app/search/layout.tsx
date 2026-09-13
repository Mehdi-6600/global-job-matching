import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/core";

/**
 * Search is a tool page. Clean URL may be reachable; prefer noindex to avoid
 * thin/duplicate search result variants. Middleware also noindexes ?query URLs.
 */
export const metadata: Metadata = buildPublicMetadata({
  title: "Search jobs",
  description:
    "Search global job listings by keyword, location, and remote options on Global Job Matching.",
  path: "/search",
  index: false,
  hreflang: false,
});

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
