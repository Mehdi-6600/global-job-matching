import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "Career Blog",
  description:
    "Career tips, guides, and insights for job seekers and employers on Global Job Matching.",
  path: "/blog",
  index: true,
  hreflang: true,
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
