"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Globe,
  Linkedin,
  Twitter,
  Briefcase,
  Heart,
  Clock,
  DollarSign,
  ChevronRight,
  Award,
  Coffee,
  Laptop,
  Plane,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface OpenJob {
  id: string;
  title: string;
  location: string;
  type: string;
  salary: string;
  postedAt: string;
  tags: string[];
}

const company = {
  name: "TechCorp",
  tagline: "Building the future of web technology",
  description:
    "TechCorp is a leading technology company focused on building innovative web solutions. We believe in creating products that make a difference in people's lives. Our team consists of passionate engineers, designers, and product thinkers who work together to solve complex problems.",
  location: "San Francisco, CA",
  website: "techcorp.com",
  email: "careers@techcorp.com",
  size: "50-200 employees",
  founded: "2018",
  linkedin: "linkedin.com/company/techcorp",
  twitter: "@techcorp",
  logo: "TC",
};

const benefits = [
  { icon: DollarSign, label: "Competitive Salary", desc: "Above market rates" },
  { icon: Heart, label: "Health Insurance", desc: "Full medical coverage" },
  { icon: Laptop, label: "Remote Friendly", desc: "Work from anywhere" },
  { icon: Coffee, label: "Learning Budget", desc: "$2k/year for courses" },
  { icon: Plane, label: "Paid Time Off", desc: "25 days + holidays" },
  { icon: Award, label: "Stock Options", desc: "Equity for all employees" },
];

const openJobs: OpenJob[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    location: "Remote",
    type: "Full-time",
    salary: "$120k - $150k",
    postedAt: "2 days ago",
    tags: ["React", "TypeScript", "Next.js"],
  },
  {
    id: "2",
    title: "Backend Engineer",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$130k - $160k",
    postedAt: "5 days ago",
    tags: ["Node.js", "PostgreSQL", "AWS"],
  },
  {
    id: "3",
    title: "Product Designer",
    location: "Remote",
    type: "Full-time",
    salary: "$100k - $130k",
    postedAt: "1 week ago",
    tags: ["Figma", "UI/UX", "Design Systems"],
  },
  {
    id: "4",
    title: "DevOps Engineer",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$140k - $170k",
    postedAt: "3 days ago",
    tags: ["Docker", "Kubernetes", "CI/CD"],
  },
];

export default function CompanyProfilePage() {
  const { t } = useLocale();
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  function toggleSave(id: string) {
    setSavedJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-2xl p-6 md:p-8 border border-white/10 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-cyan-300 font-bold text-xl shrink-0">
              {company.logo}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white">{company.name}</h1>
              <p className="text-slate-400 text-sm mt-1">{company.tagline}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {company.location}
                </span>
                <a
                  href={`https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {t("Companies.website", "Website")}
                </a>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`https://${company.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-cyan-400 transition-all"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href={`https://twitter.com/${company.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-blue-400 transition-all"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 md:p-8 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4">
                {t("About.title", "About")}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {company.description}
              </p>
            </div>

            <div className="glass rounded-2xl p-6 md:p-8 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-5">
                {t("Companies.viewProfile", "Benefits & Perks")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((b, idx) => {
                  const Icon = b.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {b.label}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {b.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 md:p-8 border border-white/10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-cyan-400" />
                  {t("Companies.jobs", "Open Positions")}
                </h2>
                <span className="text-xs text-slate-500">
                  {openJobs.length} {t("Companies.jobs", "jobs")}
                </span>
              </div>
              <div className="space-y-3">
                {openJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-sm mb-2">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {job.salary}
                        </span>
                        <span>{job.postedAt}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {job.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-slate-300 border border-white/5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleSave(job.id)}
                        className={`p-2 rounded-xl transition-all ${
                          savedJobs.includes(job.id)
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-white/5 text-slate-400"
                        }`}
                        aria-label={t("Common.save", "Save")}
                      >
                        <Heart
                          className="w-4 h-4"
                          fill={
                            savedJobs.includes(job.id)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all"
                      >
                        {t("JobDetail.apply", "Apply")}
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                {t("Companies.viewProfile", "Company Info")}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {t("Common.optional", "Founded")}
                  </span>
                  <span className="text-white">{company.founded}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {t("Common.optional", "Size")}
                  </span>
                  <span className="text-white">{company.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {t("Companies.location", "Location")}
                  </span>
                  <span className="text-white">{company.location}</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-cyan-500/10">
              <h3 className="text-white font-semibold text-sm mb-2">
                {t("Home.ctaRegister", "Want to work here?")}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                {t(
                  "Companies.subtitle",
                  "Create a profile and apply to jobs at this company and thousands of others."
                )}
              </p>
              <Link
                href="/register"
                className="block text-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                {t("Nav.register", "Create Profile")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
