"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Users,
  Share2,
  Bookmark,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Send,
} from "lucide-react";

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
  description:
    "TechFlow is looking for a Senior Frontend Engineer to join our growing team. You will be responsible for building and maintaining our core product features, working closely with designers and backend engineers to deliver exceptional user experiences.",
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
  companyInfo: {
    name: "TechFlow",
    description:
      "TechFlow is a fast-growing SaaS company building tools that help teams collaborate more effectively. Founded in 2019, we have grown to 200+ employees across 15 countries.",
    size: "200-500 employees",
    website: "techflow.io",
    industry: "Software",
  },
};

export default function JobDetailPage() {
  const [saved, setSaved] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <div className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to jobs
          </Link>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card">
                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--ios-blue)]/20 to-purple-500/20 border border-[var(--glass-border)] flex items-center justify-center text-xl font-bold text-[var(--text-primary)] flex-shrink-0">
                    {job.logo}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="glass-pill text-xs text-[var(--ios-blue)]">{job.type}</span>
                      <span className="glass-pill text-xs text-green-400">{job.category}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
                      {job.title}
                    </h1>
                    <p className="text-[var(--text-secondary)] font-medium mb-4">
                      {job.companyInfo.name}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
                      <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> {job.salary}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {job.posted}</span>
                      <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {job.applicants} applicants</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-[var(--glass-border)]">
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="btn-primary"
                  >
                    <Send className="w-4 h-4" />
                    Apply Now
                  </button>
                  <button
                    onClick={() => setSaved(!saved)}
                    className={`btn-secondary ${saved ? "border-[var(--ios-blue)]/30 text-[var(--ios-blue)]" : ""}`}
                  >
                    <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
                    {saved ? "Saved" : "Save Job"}
                  </button>
                  <button className="btn-ghost">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>

              <div className="glass-card">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">About the Role</h2>
                <p className="text-[var(--text-secondary)] leading-relaxed mb-6">{job.description}</p>

                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3">Responsibilities</h3>
                <ul className="space-y-2 mb-6">
                  {job.responsibilities.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                      <CheckCircle2 className="w-5 h-5 text-[var(--ios-blue)] flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3">Requirements</h3>
                <ul className="space-y-2 mb-6">
                  {job.requirements.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                      <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3">Benefits</h3>
                <div className="flex flex-wrap gap-2">
                  {job.benefits.map((benefit, i) => (
                    <span key={i} className="glass-pill text-[var(--text-secondary)]">{benefit}</span>
                  ))}
                </div>
              </div>

              <div className="glass-card">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Skills & Technologies</h3>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">About {job.companyInfo.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{job.companyInfo.description}</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]"><Briefcase className="w-4 h-4" /> {job.companyInfo.size}</div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]"><Sparkles className="w-4 h-4" /> {job.companyInfo.website}</div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]"><CheckCircle2 className="w-4 h-4" /> {job.companyInfo.industry}</div>
                </div>
                <button className="w-full mt-5 btn-secondary text-sm">View Company Profile</button>
              </div>

              <div className="glass-card">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">Similar Jobs</h3>
                <div className="space-y-4">
                  {[
                    { title: "Frontend Lead", company: "BigTech", location: "Remote" },
                    { title: "React Developer", company: "StartupXYZ", location: "New York, NY" },
                    { title: "UI Engineer", company: "DesignCo", location: "San Francisco, CA" },
                  ].map((j, i) => (
                    <div key={i} className="p-3 rounded-xl glass hover:border-[var(--ios-blue)]/30 transition cursor-pointer">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">{j.title}</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{j.company} · {j.location}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowApplyModal(false)} />
          <div className="relative w-full max-w-lg glass-glow rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Apply for {job.title}</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">at {job.companyInfo.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Resume / CV</label>
                <div className="h-24 rounded-xl border-2 border-dashed border-[var(--glass-border)] flex flex-col items-center justify-center text-[var(--text-muted)] hover:border-[var(--ios-blue)]/30 transition cursor-pointer">
                  <Briefcase className="w-6 h-6 mb-2" />
                  <span className="text-sm">Drop your resume here or click to upload</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Cover Letter (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Tell us why you are a great fit..."
                  className="glass-input w-full resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowApplyModal(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={() => setShowApplyModal(false)} className="flex-1 btn-primary">Submit Application</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
