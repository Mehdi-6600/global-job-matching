import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Browse companies hiring worldwide on Global Job Matching. Explore profiles and open roles.",
  alternates: {
    canonical: absoluteUrl("/companies"),
  },
  openGraph: {
    title: "Companies | Global Job Matching",
    description:
      "Browse companies hiring worldwide on Global Job Matching.",
    url: absoluteUrl("/companies"),
  },
};

export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
