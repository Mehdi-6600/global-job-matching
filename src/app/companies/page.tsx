"use client";

import { useState } from "react";
import {
  Building2,
  MapPin,
  Users,
  Briefcase,
  Search,
  ArrowRight,
  Globe,
} from "lucide-react";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  openJobs: number;
  description: string;
  tags: string[];
  isRemote: boolean;
}

const companies: Company[] = [
  {
    id: "1",
    name: "TechCorp Global",
    industry: "Technology",
    location: "San Francisco, CA",
    size: "500-1000",
    openJobs: 12,
    description: "Leading technology company specializing in scalable web applications for enterprise clients.",
    tags: ["SaaS", "Enterprise", "AI"],
    isRemote: true,
  },
  {
    id: "2",
    name: "DataFlow Systems",
    industry: "Data & Analytics",
    location: "New York, NY",
    size: "200-500",
    openJobs: 8,
    description: "Real-time data processing platforms for Fortune 500 companies.",
    tags: ["Big Data", "Cloud", "ML"],
    isRemote: true,
  },
  {
    id: "3",
    name: "Creative Studio",
    industry: "Design",
    location: "London, UK",
    size: "50-200",
    openJobs: 4,
    description: "Award-winning design agency crafting digital experiences for global brands.",
    tags: ["UI/UX", "Branding", "Web"],
    isRemote: true,
  },
  {
    id: "4",
    name: "CloudScale Inc",
    industry: "Cloud Infrastructure",
    location: "Austin, TX",
    size: "1000+",
    openJobs: 24,
    description: "Cloud infrastructure provider helping businesses scale globally.",
    tags: ["DevOps", "AWS", "K8s"],
    isRemote: true,
  },
  {
    id: "5",
    name: "FinTech Pro",
    industry: "Finance",
    location: "Singapore",
    size: "200-500",
    openJobs: 6,
    description: "Next-generation financial technology solutions for modern banking.",
    tags: ["Blockchain", "Payments", "Security"],
    isRemote: false,
  },
  {
    id: "6",
    name: "HealthTech AI",
    industry: "Healthcare",
    location: "Berlin, Germany",
    size: "50-200",
    openJobs: 3,
    description: "AI-powered healthcare diagnostics and patient care platforms.",
    tags: ["AI", "Health", "SaaS"],
    isRemote: true,
  },
];

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const industries = ["All", ...Array.from(new Set(companies.map((c) => c.industry)))];

  const filtered = companies.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === "All" || c.industry === filter;
    return matchSearch && matchFilter;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Companies</h1>
          <p className="text-slate-400 text-sm">Discover great places to work</p>
        </div>

        {/* Search & Filter */}
        <div className="glass rounded-2xl p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies or tags..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setFilter(ind)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    filter === ind
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="glass rounded-2xl p-6 group hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-cyan-400" />
                </div>
                <span className="text-xs text-slate-500 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  {company.industry}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                {company.name}
              </h3>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">{company.description}</p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {company.location}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {company.size}
                </span>
                <span className="flex items-center gap-1">
                  {company.isRemote ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                  {company.isRemote ? "Remote OK" : "On-site"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex flex-wrap gap-1.5">
                  {company.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="flex items-center gap-1 text-cyan-400 text-sm font-medium">
                  <Briefcase className="w-3.5 h-3.5" />
                  {company.openJobs}
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No companies found matching your search.</p>
          </div>
        )}
      </div>
    </main>
  );
}
