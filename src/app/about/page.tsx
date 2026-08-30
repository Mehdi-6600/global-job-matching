import { Metadata } from "next";
import AboutContent from "./AboutContent";

export const metadata: Metadata = {
  title: "About Us | Global Job Matching",
  description:
    "Learn more about Global Job Matching — a modern job board connecting talent and employers worldwide.",
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
