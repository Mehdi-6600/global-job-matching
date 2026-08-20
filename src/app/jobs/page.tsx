"use client";

import { useState } from "react";
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Bookmark,
  Filter,
  ChevronDown,
  Star,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const jobTypes = ["All", "Full-time", "Part-time", "Contract", "Remote"];
const categories = [
  "All",
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Product",
  "Data",
];

const jobs = [
  {
    id: 1,
    title: "Senior Frontend Engineer",
    company: "TechFlow",
    location: "Remote",
    type: "Full-time",
    salary: "$120k – $160k",
    posted: "2 days ago",
    category: "Engineering",
    logo: "TF",
    featured: true,
    tags: ["React", "TypeScript", "Next.js"],
  },
  {
    id: 2,
    title: "Product Designer",
    company: "PixelCraft",
    location: "New York, NY",
    type: "Full-time",
    salary: "$100k – $140k",
    posted: "3 days ago",
    category: "Design",
    logo: "PC",
    featured: false,
    tags: ["Figma", "UI/UX", "Design Systems"],
  },
  {
    id: 3,
    title: "Data Scientist",
    company: "DataMind",
    location: "San Francisco, CA",
    type: "Contract",
    salary: "$90 – $120/hr",
    posted: "5 days ago",
    category: "Data",
    logo: "DM",
    featured: true,
    tags: ["Python", "ML", "SQL"],
  },
  {
    id: 4,
    title: "Growth Marketing Manager",
    company: "ScaleUp",
    location: "Remote",
    type: "Full-time",
    salary: "$90k – $120k",
    posted: "1 week ago",
    category: "Marketing",
    logo: "SU",
    featured: false,
    tags: ["SEO", "Content", "Analytics"],
  },
  {
    id: 5,
    title: "Backend Engineer",
    company: "CloudNine",
    location: "Austin, TX",
    type: "Full-time",
    salary: "$130k – $170k",
    posted: "1 week ago",
    category: "Engineering",
    logo: "CN",
    featured: false,
    tags: ["Node.js", "PostgreSQL", "AWS"],
  },
  {
    id: 6,
    title: "UX Researcher",
    company: "UserFirst",
    location: "Remote",
    type: "Part-time",
    salary: "$60 – $90/hr",
    posted: "2 weeks ago",
    category: "Design",
    logo: "UF",
    featured: false,
    tags: ["User Research", "Usability", "Figma"],
  },
];

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [savedJobs, setSavedJobs] = useState<number[]>([]);

  const toggleSave = (id: number) => {
    setSavedJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "All" || job.type === selectedType;
    const matchesCategory =
      selectedCategory === "All" || job.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent mb-6">
            Find Your Dream Job
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
            Browse thousands of opportunities from top companies around the
            world. Your next career move starts here.
          </p>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center px-4 h-12">
                <Search className="w-5 h-5 text-white/40 mr-3" />
                <input
                  type="text"
                  placeholder="Job title, company, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-white placeholder-white/40 outline-none"
                />
              </div>
              <button className="h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/25">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="flex items-center gap-2 text-white/60">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
            </div>

            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none glass rounded-xl px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              >
                {jobTypes.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none glass rounded-xl px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-slate-900">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>

            <span className="ml-auto text-sm text-white/40">
              {filteredJobs.length} jobs found
            </span>
          </div>

          {/* Job Grid */}
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="glass rounded-2xl p-6 hover:bg-white/[0.15] transition-all duration-300 group relative overflow-hidden"
              >
                {job.featured && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-amber-400 text-xs font-semibold">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg font-bold text-white/80">
                    {job.logo}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-white/60 text-sm">{job.company}</p>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-white/50">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {job.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {job.salary}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {job.posted}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-white/70 border border-white/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSave(job.id)}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        savedJobs.includes(job.id)
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "glass text-white/40 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Bookmark
                        className={`w-5 h-5 ${
                          savedJobs.includes(job.id) ? "fill-current" : ""
                        }`}
                      />
                    </button>
                    <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-500/25">
                      Apply Now
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredJobs.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center">
                <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white/60 mb-2">
                  No jobs found
                </h3>
                <p className="text-white/40">
                  Try adjusting your search or filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
