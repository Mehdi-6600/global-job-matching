import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "AI Career Risk Analysis",
  description:
    "Analyze how automation and AI may affect your role, get a localized 90-day roadmap, and explore skill-based migration options across global markets.",
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
