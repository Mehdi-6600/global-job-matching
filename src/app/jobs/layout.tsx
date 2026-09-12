import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

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
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
