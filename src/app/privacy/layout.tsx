import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Global Job Matching collects, uses, and protects your personal data.",
  alternates: { canonical: absoluteUrl("/privacy") },
  openGraph: {
    title: "Privacy Policy | Global Job Matching",
    description:
      "Privacy practices for Global Job Matching users and employers.",
    url: absoluteUrl("/privacy"),
  },
  robots: { index: true, follow: true },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
