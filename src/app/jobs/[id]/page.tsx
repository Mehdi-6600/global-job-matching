"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Heart,
  Share2,
  Send,
  CheckCircle2,
  Globe,
  Users,
  Calendar,
  ChevronLeft,
  Layers,
  AlignLeft,
  Award,
} from "lucide-react";

interface JobDetail {
  id: string;
  title: string;
  company: string;
  companyId: string;
  location: string;
  type: string;
  salary: string;
  experience: string;
  postedAt: string;
  deadline: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  tags: string[];
  logo: string;
  companySize: string;
  companyWebsite: string;
  applicants: number;
}

const jobData: JobDetail = {
  id: "1",
  title: "Senior Frontend Developer",
  company: "TechCorp",
  companyId: "techcorp",
  location: "Remote",
  type: "Full-time",
  salary: "$120k - $150k / year",
  experience: "3-5 years",
  postedAt: "2 days ago",
  deadline: "Sep 15, 2026",
  description:
    "We are looking for an experienced Frontend Developer to join our growing team. You will be responsible for building and maintaining user interfaces for our web applications, collaborating with designers and backend engineers, and ensuring the best possible user experience.",
  requirements: [
    "3+ years of experience with React and modern JavaScript",
    "Strong understanding of TypeScript and state management",
    "Experience with Next.js and server-side rendering",
    "Familiarity with Tailwind CSS and responsive design",
    "Good communication skills and ability to work in a team",
  ],
  responsibilities: [
    "Develop and maintain frontend features using React and Next.js",
    "Collaborate with UX/UI designers to implement responsive designs",
    "Optimize applications for maximum speed and scalability",
    "Write clean, maintainable, and well-documented code",
    "Participate in code reviews and mentor junior developers",
  ],
  benefits: [
    "Competitive salary and stock options",
    "Flexible working hours and remote-first culture",
    "Health, dental, and vision insurance",
    "Annual learning budget of $2,000",
    "25 days paid time off + public holidays",
  ],
  tags: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"],
  logo: "TC",
  companySize: "50-200 employees",
  companyWebsite: "techcorp.com",
  applicants: 42,
};

export default function JobDetailPage() {
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to jobs
        </Link>

        {/* Header Card */}
        <div className="glass rounded-3xl p-6 md:p-8 mb-6 border border-white/5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <span className="text-cyan-400 font-bold text-xl">{jobData.logo}</span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{jobData.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    {jobData.company}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {jobData.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {jobData.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {jobData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-cyan-300 border border-cyan-500/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSaved(!saved)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  saved
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                }`}
              >
                <Heart
                  className="w-4 h-4"
                  fill={saved ? "currentColor" : "none"}
                />
                {saved ? "Saved" : "Save"}
              </button>
              <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Salary</p>
                <p className="text-white text-sm font-medium">{jobData.salary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Experience</p>
                <p className="text-white text-sm font-medium">{jobData.experience}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Deadline</p>
                <p className="text-white text-sm font-medium">{jobData.deadline}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Applicants</p>
                <p className="text-white text-sm font-medium">{jobData.applicants}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlignLeft className="w-5 h-5 text-cyan-400" />
                Description
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">{jobData.description}</p>
            </div>

            {/* Responsibilities */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                Responsibilities
              </h2>
              <ul className="space-y-3">
                {jobData.responsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Requirements
              </h2>
              <ul className="space-y-3">
                {jobData.requirements.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Benefits
              </h2>
              <ul className="space-y-3">
                {jobData.benefits.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="glass rounded-2xl p-6 sticky top-24">
              {!applied ? (
                <>
                  <button
                    onClick={() => setApplied(true)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl text-sm font-medium transition-all mb-3"
                  >
                    <Send className="w-4 h-4" />
                    Apply Now
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Easy 1-click application with your profile
                  </p>
                </>
              ) : (
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-white font-medium text-sm mb-1">Application Sent!</p>
                  <p className="text-slate-400 text-xs">Good luck with your application.</p>
                </div>
              )}

              <div className="h-px bg-white/5 my-5" />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Posted</span>
                  <span className="text-white">{jobData.postedAt}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Job ID</span>
                  <span className="text-white font-mono text-xs">{jobData.id}</span>
                </div>
              </div>
            </div>

            {/* Company Card */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-white font-semibold text-sm mb-4">About {jobData.company}</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 font-bold text-sm">{jobData.logo}</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{jobData.company}</p>
                  <p className="text-slate-500 text-xs">{jobData.companySize}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Globe className="w-3.5 h-3.5" />
                  {jobData.companyWebsite}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                  {jobData.location}
                </div>
              </div>
              <Link
                href={`/company/${jobData.companyId}`}
                className="block text-center text-cyan-400 text-xs hover:underline"
              >
                View Company Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
