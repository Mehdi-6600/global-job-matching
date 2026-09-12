import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Career Blog",
  description:
    "Career tips, guides, and insights for job seekers and employers on Global Job Matching.",
  alternates: { canonical: absoluteUrl("/blog") },
  openGraph: {
    title: "Career Blog | Global Job Matching",
    description: "Tips and guides for your career journey.",
    url: absoluteUrl("/blog"),
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
