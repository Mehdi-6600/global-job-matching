import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { DEFAULT_OG_PATH } from "@/lib/seo/core";

export const metadata: Metadata = {
  title: "Search jobs",
  description:
    "Search global job listings by keyword, location, and remote options on Global Job Matching.",
  alternates: {
    canonical: absoluteUrl("/search"),
  },
  openGraph: {
    title: "Search jobs | Global Job Matching",
    description: "Find jobs worldwide by keyword and location.",
    url: absoluteUrl("/search"),
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_PATH),
        width: 1200,
        height: 630,
        alt: "Search jobs on Global Job Matching",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Search jobs | Global Job Matching",
    description: "Find jobs worldwide by keyword and location.",
    images: [absoluteUrl(DEFAULT_OG_PATH)],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
