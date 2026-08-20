"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Calendar,
  Building2,
  Globe,
  Users,
  Share2,
  Bookmark,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Send,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

// Mock data — replace with API call
const job = {
  id: 1,
  title: "Senior Frontend Engineer",
  company: "TechFlow",
  logo: "TF",
  location: "Remote",
  type: "Full-time",
  salary: "$120k – $160k",
  posted: "2 days ago",
  applicants: 48,
  experience: "5+ years",
  category: "Engineering",
  tags: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"],
  description: `
    TechFlow is looking for a Senior Frontend Engineer to join our growing team. 
    You'll be responsible for building and maintaining our core product features, 
    working closely with designers and backend engineers to deliver exceptional user experiences.
  `,
  responsibilities: [
    "Lead frontend architecture decisions and mentor junior developers",
    "Build reusable component libraries and design systems",
    "Optimize application performance and ensure accessibility standards",
    "Collaborate with product and design teams to implement new features",
    "Write clean, maintainable, and well-tested code",
  ],
  requirements: [
    "5+ years of professional frontend development experience",
    "Deep expertise in React, TypeScript, and modern CSS",
    "Experience with Next.js and server-side rendering",
    "Strong understanding of web performance optimization",
    "Excellent communication and teamwork skills",
  ],
  benefits: [
    "Competitive salary and equity package",
    "Fully remote with flexible hours",
    "Health, dental, and vision insurance",
    "Annual learning budget of $2,000",
    "Unlimited PTO",
    "Home office stipend",
  ],
  company: {
    name: "TechFlow",
    description:
      "TechFlow is a fast-growing SaaS company building tools that help teams collaborate more effectively. Founded in 2019, we've grown to 200+ employees across 15 countries.",
    size: "200-500 employees",
    website: "techflow.io",
    industry: "Software",
  },
};

export default function JobDetailPage() {
  const [saved, setSaved] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <Navbar />

      <div className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Link */}
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to jobs
          </Link>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Header Card */}
              <div className="glass rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl font-bold text-white/80 flex-shrink-0">
                    {job.logo}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {job.type}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {job.category}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                      {job.title}
                    </h1>
                    <p className="text-white/60 font-medium mb-4">
                      {job.company.name}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-white/50">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" />
                        {job.salary}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {job.posted}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {job.applicants} applicants
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/10">
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="h-11 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Apply Now
                  </button>
                  <button
                    onClick={() => setSaved(!saved)}
                    className={`h-11 px-4 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 border ${
                      saved
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : "glass text-white/60 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${saved ? "fill-current" : ""}`}
                    />
                    {saved ? "Saved" : "Save Job"}
                  </button>
                  <button className="h-11 px-4 glass rounded-xl text-sm text-white/60 hover:bg-white/10 transition-colors flex items-center gap-2 border border-white/10">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="glass rounded-2xl p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-white mb-4">
                  About the Role
                </h2>
                <p className="text-white/60 leading-relaxed mb-6">
                  {job.description}
                </p>

                <h3 className="text-md font-semibold text-white mb-3">
                  Responsibilities
                </h3>
                <ul className="space-y-2 mb-6">
                  {job.responsibilities.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-white/60"
                    >
                      <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <h3 className="text-md font-semibold text-white mb-3">
                  Requirements
                </h3>
                <ul className="space-y-2 mb-6">
                  {job.requirements.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-white/60"
                    >
                      <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <h3 className="text-md font-semibold text-white mb-3">
                  Benefits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.benefits.map((benefit, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg text-sm bg-white/5 text-white/70 border border-white/10"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/70 mb-3">
                  Skills & Technologies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Company Card */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
                  About {job.company.name}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed mb-4">
                  {job.company.description}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    <Building2 className="w-4 h-4 text-white/30" />
                    {job.company.size}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    <Globe className="w-4 h-4 text-white/30" />
                    {job.company.website}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    <Briefcase className="w-4 h-4 text-white/30" />
                    {job.company.industry}
                  </div>
                </div>
                <button className="w-full mt-5 h-10 glass rounded-xl text-sm text-white/60 hover:bg-white/10 transition-colors border border-white/10">
                  View Company Profile
                </button>
              </div>

              {/* Similar Jobs */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
                  Similar Jobs
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      title: "Frontend Lead",
                      company: "BigTech",
                      location: "Remote",
                    },
                    {
                      title: "React Developer",
                      company: "StartupXYZ",
                      location: "New York, NY",
                    },
                    {
                      title: "UI Engineer",
                      company: "DesignCo",
                      location: "San Francisco, CA",
                    },
                  ].map((j, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                    >
                      <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {j.title}
                      </h4>
                      <p className="text-xs text-white/40 mt-1">
                        {j.company} • {j.location}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowApplyModal(false)}
          />
          <div className="relative w-full max-w-lg glass rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
            <h2 className="text-xl font-bold text-white mb-2">
              Apply for {job.title}
            </h2>
            <p className="text-sm text-white/50 mb-6">
              at {job.company.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Resume / CV
                </label>
                <div className="h-24 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/30 hover:border-white/20 hover:text-white/50 transition-colors cursor-pointer">
                  <Briefcase className="w-6 h-6 mb-2" />
                  <span className="text-sm">Drop your resume here or click to upload</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Cover Letter (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us why you're a great fit..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 h-11 glass rounded-xl text-sm text-white/60 hover:bg-white/10 transition-colors border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
