import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Global Job Matching",
  description: "Learn more about Global Job Matching and our mission.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass-card p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-6">
          About Global Job Matching
        </h1>
        <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-6">
          Global Job Matching is an AI-powered platform built to connect talented professionals
          with the best opportunities worldwide. Whether you are looking for your next remote role
          or a local dream job, our smart matching algorithm ensures you never miss the right fit.
        </p>
        <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-8">
          Founded in 2024, we have helped thousands of job seekers and hundreds of companies
          find each other faster, smarter, and with complete transparency.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-4 glass rounded-xl">
            <div className="text-3xl font-bold text-[var(--ios-blue)]">500+</div>
            <div className="text-sm text-[var(--text-muted)] mt-1">Companies</div>
          </div>
          <div className="text-center p-4 glass rounded-xl">
            <div className="text-3xl font-bold text-[var(--ios-blue)]">10K+</div>
            <div className="text-sm text-[var(--text-muted)] mt-1">Jobs Matched</div>
          </div>
          <div className="text-center p-4 glass rounded-xl">
            <div className="text-3xl font-bold text-[var(--ios-blue)]">150+</div>
            <div className="text-sm text-[var(--text-muted)] mt-1">Countries</div>
          </div>
        </div>
        <Link href="/jobs" className="btn-primary">
          Browse Jobs
        </Link>
      </div>
    </main>
  );
}
