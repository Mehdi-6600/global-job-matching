import type { Metadata } from "next";
import AboutContent from "./AboutContent";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn more about Global Job Matching — a modern job board connecting talent and employers worldwide.",
  alternates: { canonical: absoluteUrl("/about") },
  openGraph: {
    title: "About Us | Global Job Matching",
    description:
      "Learn more about Global Job Matching — connecting talent and employers worldwide.",
    url: absoluteUrl("/about"),
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <AboutContent />
      </div>
    </main>
  );
}
