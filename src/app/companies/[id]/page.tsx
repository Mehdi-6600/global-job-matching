"use client";

import { useParams } from "next/navigation";
import {
  Building2,
  MapPin,
  Users,
  Briefcase,
  ArrowLeft,
  Globe,
  Heart,
  Share2,
  ExternalLink,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

interface CompanyDetail {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  founded: string;
  website: string;
  description: string;
  mission: string;
  culture: string[];
  benefits: string[];
  tags: string[];
  isRemote: boolean;
  openJobs: {
    id: string;
    title: string;
    type: string;
    salary: string;
    postedAt: string;
    tags: string[];
  }[];
}

const companyData: Record<string, CompanyDetail> = {
  "1": {
    id: "1",
    name: "TechCorp Global",
    industry: "Technology",
    location: "San Francisco, CA",
    size: "500-1000",
    founded: "2015",
    website: "https://techcorp.com",
    description:
      "TechCorp Global is a leading technology company specializing in building scalable web applications for enterprise clients. With over 500 employees worldwide, we are committed to innovation and excellence.",
    mission:
      "To empower businesses with cutting-edge technology solutions that drive growth and efficiency.",
    culture: [
      "Remote-first culture",
      "Continuous learning",
      "Diversity & inclusion",
      "Work-life balance",
    ],
    benefits: [
      "Competitive salary & equity",
      "Unlimited PTO",
      "Health, dental, vision",
      "Home office stipend",
      "Annual learning budget",
    ],
    tags: ["SaaS", "Enterprise", "AI", "Cloud"],
    isRemote: true,
    openJobs: [
      {
        id: "1",
        title: "Senior Frontend Developer",
        type: "Full-time",
        salary: "$120k - $160k",
        postedAt: "2 days ago",
        tags: ["React", "Next.js", "TypeScript"],
      },
      {
        id: "7",
        title: "Product Manager",
        type: "Full-time",
        salary: "$140k - $180k",
        postedAt: "3 days ago",
        tags: ["Agile", "SaaS", "Strategy"],
      },
    ],
  },
  "2": {
    id: "2",
    name: "DataFlow Systems",
    industry: "Data & Analytics",
    location: "New York, NY",
    size: "200-500",
    founded: "2018",
    website: "https://dataflow.io",
    description:
      "DataFlow Systems builds real-time data processing platforms for Fortune 500 companies. Our mission is to make data accessible and actionable.",
    mission: "Transforming raw data into actionable insights for global enterprises.",
    culture: [
      "Data-driven decisions",
      "Open source contributors",
      "Mentorship programs",
      "Hackathons",
    ],
    benefits: [
      "Flexible hours",
      "401(k) matching",
      "Team retreats",
      "Conference budget",
    ],
    tags: ["Big Data", "Cloud", "ML", "Open Source"],
    isRemote: true,
    openJobs: [
      {
        id: "2",
        title: "Backend Engineer",
        type: "Full-time",
        salary: "$130k - $170k",
        postedAt: "1 day ago",
        tags: ["Node.js", "PostgreSQL", "AWS"],
      },
    ],
  },
};

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;
  const company = companyData[companyId] || companyData["1"];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <Link
          href="/companies"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to companies
        </Link>

        {/* Header */}
        <div className="glass rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                <Building2 className="w-10 h-10 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{company.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {company.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {company.size} employees
                  </span>
                  <span className="flex items-center gap-1.5">
                    {company.isRemote ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    {company.isRemote ? "Remote-first" : "On-site"}
                  </span>
                  <span className="text-slate-500">Founded {company.founded}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-3 rounded-xl glass hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                <Heart className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-xl glass hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                <Share2 className="w-5 h-5" />
              </button>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Website
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/10">
            {company.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 border border-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-4">About</h2>
              <p className="text-slate-300 leading-relaxed mb-6">{company.description}</p>

              <h3 className="text-lg font-semibold text-white mb-3">Mission</h3>
              <p className="text-slate-300 leading-relaxed">{company.mission}</p>
            </div>

            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-4">Culture</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {company.culture.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Open Jobs */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-cyan-400" />
                  Open Positions
                </h2>
                <span className="text-sm text-slate-400">{company.openJobs.length} jobs</span>
              </div>
              <div className="space-y-4">
                {company.openJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors group"
                  >
                    <div>
                      <h4 className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                        {job.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {job.salary}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.postedAt}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-cyan-400 text-sm font-medium whitespace-nowrap">
                      View →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Benefits</h3>
              <div className="space-y-3">
                {company.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-slate-300 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Company Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Industry</span>
                  <span className="text-white text-sm font-medium">{company.industry}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Company Size</span>
                  <span className="text-white text-sm font-medium">{company.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Founded</span>
                  <span className="text-white text-sm font-medium">{company.founded}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Open Jobs</span>
                  <span className="text-cyan-400 text-sm font-medium">{company.openJobs.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
