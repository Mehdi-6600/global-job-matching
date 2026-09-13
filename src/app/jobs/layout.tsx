import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { DEFAULT_OG_PATH } from "@/lib/seo/core";

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

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
