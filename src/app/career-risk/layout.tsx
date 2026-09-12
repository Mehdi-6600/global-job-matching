import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "AI Career Risk",
  description:
    "Analyze how automation and AI may affect your role, get a 90-day roadmap, and explore skill-based migration options.",
  alternates: {
    canonical: absoluteUrl("/career-risk"),
  },
  openGraph: {
    title: "AI Career Risk | Global Job Matching",
    description:
      "Check automation risk for your job, build a 90-day plan, and explore migration pathways.",
    url: absoluteUrl("/career-risk"),
  },
  robots: { index: true, follow: true },
};

export default function CareerRiskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
