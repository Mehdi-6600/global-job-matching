import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "Privacy Policy",
  description:
    "How Global Job Matching collects, uses, and protects your personal data.",
  path: "/privacy",
  index: true,
});

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
