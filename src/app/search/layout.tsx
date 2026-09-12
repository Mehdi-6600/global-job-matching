import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Search jobs",
  description:
    "Search global job listings by keyword, location, and remote options on Global Job Matching.",
  alternates: { canonical: absoluteUrl("/search") },
  openGraph: {
    title: "Search jobs | Global Job Matching",
    description: "Find jobs worldwide by keyword and location.",
    url: absoluteUrl("/search"),
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
