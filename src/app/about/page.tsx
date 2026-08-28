import { Metadata } from "next";
import Link from "next/link";
import { Globe, Search, Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Global Job Matching",
  description:
    "Learn more about Global Job Matching — a modern job board connecting talent and employers worldwide.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="glass rounded-2xl p-8 sm:p-12 border border-white/10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            About Global Job Matching
          </h1>

          <p className="text-slate-300 text-lg leading-relaxed mb-6">
            Global Job Matching is a modern job board built to help professionals
            discover opportunities and help employers reach the right candidates —
            with clear filters, simple applications, and a clean experience.
          </p>

          <p className="text-slate-400 leading-relaxed mb-10">
            We focus on practical features: search and filters, saved jobs,
            applications tracking, company profiles, and an employer panel to post
            roles and review applicants. No hype — just tools that work.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {[
              {
                icon: <Search className="w-5 h-5 text-sky-400" />,
                title: "Smart search",
                desc: "Filter by role, location, remote, and more.",
              },
              {
                icon: <Globe className="w-5 h-5 text-sky-400" />,
                title: "Global listings",
                desc: "Jobs and companies from many markets in one place.",
              },
              {
                icon: <Users className="w-5 h-5 text-sky-400" />,
                title: "For both sides",
                desc: "Job seekers apply; employers post and manage applicants.",
              },
              {
                icon: <Zap className="w-5 h-5 text-sky-400" />,
                title: "Fast workflow",
                desc: "Profile once, apply quickly, track status in your dashboard.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl p-4 bg-white/5 border border-white/10"
              >
                <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/jobs"
              className="inline-flex justify-center px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-all"
            >
              Browse Jobs
            </Link>
            <Link
              href="/contact"
              className="inline-flex justify-center px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
