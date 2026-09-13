import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "AI Resume Builder",
  description:
    "Generate a professional resume with AI. Edit, copy, and save notes to your profile on Global Job Matching.",
  path: "/resume-builder",
  index: true,
});

export default function ResumeBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
