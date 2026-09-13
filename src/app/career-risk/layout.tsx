import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "AI Career Risk",
  description:
    "Analyze how automation and AI may affect your role, get a 90-day roadmap, and explore skill-based migration options.",
  path: "/career-risk",
  index: true,
  hreflang: true,
});

export default function CareerRiskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
