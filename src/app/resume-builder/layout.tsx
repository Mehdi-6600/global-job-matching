import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "AI Resume Builder",
  description:
    "Generate a professional resume with AI. Edit, copy, and save notes to your profile on Global Job Matching.",
  alternates: { canonical: absoluteUrl("/resume-builder") },
  openGraph: {
    title: "AI Resume Builder | Global Job Matching",
    description: "Build a clear professional resume with AI assistance.",
    url: absoluteUrl("/resume-builder"),
  },
  robots: { index: true, follow: true },
};

export default function ResumeBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
