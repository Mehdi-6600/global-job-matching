import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "Terms of Service",
  description:
    "Terms and conditions for using Global Job Matching as a job seeker or employer.",
  path: "/terms",
  index: true,
  hreflang: true,
});

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
