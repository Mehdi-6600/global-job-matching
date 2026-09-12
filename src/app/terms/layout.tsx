import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions for using Global Job Matching as a job seeker or employer.",
  alternates: { canonical: absoluteUrl("/terms") },
  openGraph: {
    title: "Terms of Service | Global Job Matching",
    description: "Terms of use for the Global Job Matching platform.",
    url: absoluteUrl("/terms"),
  },
  robots: { index: true, follow: true },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
