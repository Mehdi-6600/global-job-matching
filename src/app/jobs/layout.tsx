import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Jobs",
  description:
    "Explore active job listings worldwide. Filter by location, remote work, and role on Global Job Matching.",
  openGraph: {
    title: "Browse Jobs | Global Job Matching",
    description:
      "Explore active job listings worldwide on Global Job Matching.",
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
