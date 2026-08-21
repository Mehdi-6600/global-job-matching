"use client";

import Link from "next/link";
import {
  Search,
  Globe,
  Zap,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const features = [
  {
    icon: Globe,
    title: "Global Reach",
    desc: "Access job listings from top platforms worldwide — Arbeitnow, RemoteOK, and Jooble.",
  },
  {
    icon: Zap,
    title: "Smart Matching",
    desc: "AI-powered recommendations that learn your preferences and surface the best fits.",
  },
  {
    icon: Shield,
    title: "Verified Listings",
    desc: "Every job is vetted for authenticity. No scams, no duplicates, just real opportunities.",
  },
  {
    icon: TrendingUp,
    title: "Career Growth",
    desc: "Track applications, save favorites, and get insights to accelerate your career.",
  },
];

const stats = [
  { value: "50K+", label: "Active Jobs" },
  { value: "120+", label: "Countries" },
  { value: "10K+", label: "Companies" },
  { value: "1M+", label: "Users" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <Navbar />

      {/* Hero Section — Full Width Glass */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#3B82F6]/10 dark:bg-[#3B82F6]/15 rounded-full blur-[100px]" />
          <div className="absolute top-40 -left-40 w-[400px] h-[400px] bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="glass-section p-8 sm:p-12 lg:p-16 text-center">
            <div className="inline-flex items-center gap-2 glass-pill mb-8">
              <Zap className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Now with AI-powered matching</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              Find Your{" "}
              <span className="gradient-text">Dream Job</span>
              <br />
              Anywhere in the World
            </h1>

            <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10">
              Connect with top opportunities from around the globe.
              One platform, thousands of real listings, zero hassle.
            </p>

            {/* Search Bar — Glass */}
            <div className="max-w-2xl mx-auto">
              <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-glow">
                <div className="flex-1 flex items-center px-4 h-14">
                  <Search className="w-5 h-5 text-[var(--text-muted)] mr-3" />
                  <input
                    type="text"
                    placeholder="Job title, company, or keywords..."
                    className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                  />
                </div>
                <Link
                  href="/jobs"
                  className="h-14 px-8 btn-primary flex items-center justify-center gap-2 rounded-xl"
                >
                  <Search className="w-4 h-4" />
                  Search Jobs
                </Link>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section — Edge to Edge Glass Strip */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Choose <span className="gradient-text">GlobalJob</span>?
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Everything you need to land your next role, all in one beautifully designed platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card group cursor-default"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5 shadow-glow group-hover:shadow-glow-accent transition-shadow">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section — Full Width Glass */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass-section p-10 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Find Your Next Opportunity?
              </h2>
              <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
                Join thousands of professionals who found their dream job through GlobalJob.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/jobs" className="btn-primary flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Browse Jobs
                </Link>
                <Link href="/register" className="btn-secondary flex items-center gap-2">
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
