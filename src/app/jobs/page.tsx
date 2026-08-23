"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Heart,
  SlidersHorizontal,
  X,
  ChevronDown,
  Briefcase,
  Layers,
  Wifi,
  WifiOff,
  RotateCcw,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: number;
  salaryMax: number;
  currency: string;
  experience: string;
  postedAt: string;
  tags: string[];
  logo: string;
  category: string;
  remote: boolean;
}

const allJobs: Job[] = [
  {
    id: "1", title: "Senior Frontend Developer", company: "TechCorp",
    location: "Remote", type: "Full-time", salary: 120000, salaryMax: 150000,
    currency: "$", experience: "Senior", postedAt: "2 days ago",
    tags: ["React", "TypeScript", "Next.js"], logo: "TC", category: "Technology", remote: true,
  },
  {
    id: "2", title: "Backend Engineer", company: "CloudScale",
    location: "London, UK", type: "Full-time", salary: 80000, salaryMax: 100000,
    currency: "£", experience: "Mid", postedAt: "5 days ago",
    tags: ["Node.js", "PostgreSQL", "AWS"], logo: "CS", category: "Technology", remote: false,
  },
  {
    id: "3", title: "Product Designer", company: "Creative Studio",
    location: "Paris, France", type: "Contract", salary: 60000, salaryMax: 80000,
    currency: "€", experience: "Mid", postedAt: "1 week ago",
    tags: ["Figma", "UI/UX"], logo: "CR", category: "Design", remote: true,
  },
  {
    id: "4", title: "DevOps Engineer", company: "DataFlow",
    location: "Berlin, Germany", type: "Full-time", salary: 90000, salaryMax: 110000,
    currency: "€", experience: "Senior", postedAt: "3 days ago",
    tags: ["Docker", "Kubernetes"], logo: "DF", category: "Technology", remote: false,
  },
  {
    id: "5", title: "Marketing Manager", company: "GrowthLabs",
    location: "Remote", type: "Full-time", salary: 70000, salaryMax: 90000,
    currency: "$", experience: "Lead", postedAt: "4 days ago",
    tags: ["SEO", "Content", "Analytics"], logo: "GL", category: "Marketing", remote: true,
  },
  {
    id: "6", title: "HR Specialist", company: "PeopleFirst",
    location: "New York, USA", type: "Part-time", salary: 40000, salaryMax: 55000,
    currency: "$", experience: "Entry", postedAt: "1 day ago",
    tags: ["Recruiting", "HRIS"], logo: "PF", category: "HR", remote: false,
  },
  {
    id: "7", title: "Data Scientist", company: "AI Solutions",
    location: "Remote", type: "Full-time", salary: 130000, salaryMax: 160000,
    currency: "$", experience: "Senior", postedAt: "6 days ago",
    tags: ["Python", "ML", "TensorFlow"], logo: "AI", category: "Technology", remote: true,
  },
  {
    id: "8", title: "Sales Representative", company: "CloudScale",
    location: "London, UK", type: "Full-time", salary: 50000, salaryMax: 70000,
    currency: "£", experience: "Entry", postedAt: "3 days ago",
    tags: ["B2B", "CRM"], logo: "CS", category: "Sales", remote: false,
  },
  {
    id: "9", title: "Healthcare Analyst", company: "MediData",
    location: "Toronto, Canada", type: "Contract", salary: 75000, salaryMax: 95000,
    currency: "$", experience: "Mid", postedAt: "2 weeks ago",
    tags: ["SQL", "Tableau"], logo: "MD", category: "Healthcare", remote: true,
  },
  {
    id: "10", title: "Finance Manager", company: "FinCorp",
    location: "Singapore", type: "Full-time", salary: 100000, salaryMax: 130000,
    currency: "$", experience: "Lead", postedAt: "1 week ago",
    tags: ["Excel", "Forecasting"], logo: "FC", category: "Finance", remote: false,
  },
];

const categories = ["All", "Technology", "Design", "Marketing", "Finance", "Healthcare", "Sales", "HR"];
const types = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const experiences = ["Entry", "Mid", "Senior", "Lead", "Executive"];
const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "salary-high", label: "Salary: High to Low" },
  { value: "salary-low", label: "Salary: Low to High" },
];

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const toggleExperience = (e: string) => {
    setSelectedExperiences((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  };

  const toggleSave = (id: string) => {
    setSavedJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setSelectedTypes([]);
    setSelectedExperiences([]);
    setRemoteOnly(false);
    setMinSalary("");
    setMaxSalary("");
    setSortBy("newest");
  };

  const filtered = useMemo(() => {
    let result = allJobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase()) ||
        job.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory =
        selectedCategory === "All" || job.category === selectedCategory;

      const matchesType =
        selectedTypes.length === 0 || selectedTypes.includes(job.type);

      const matchesExp =
        selectedExperiences.length === 0 || selectedExperiences.includes(job.experience);

      const matchesRemote = !remoteOnly || job.remote;

      const matchesSalary =
        (!minSalary || job.salary >= Number(minSalary)) &&
        (!maxSalary || job.salaryMax <= Number(maxSalary));

      return matchesSearch && matchesCategory && matchesType && matchesExp && matchesRemote && matchesSalary;
    });

    if (sortBy === "salary-high") {
      result = [...result].sort((a, b) => b.salaryMax - a.salaryMax);
    } else if (sortBy === "salary-low") {
      result = [...result].sort((a, b) => a.salary - b.salary);
    }

    return result;
  }, [search, selectedCategory, selectedTypes, selectedExperiences, remoteOnly, minSalary, maxSalary, sortBy]);

  const activeFiltersCount =
    (selectedCategory !== "All" ? 1 : 0) +
    selectedTypes.length +
    selectedExperiences.length +
    (remoteOnly ? 1 : 0) +
    (minSalary ? 1 : 0) +
    (maxSalary ? 1 : 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Find Your Dream Job</h1>
          <p className="text-slate-400 text-sm">{filtered.length} open positions available</p>
        </div>

        {/* Search Bar */}
        <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, company, or skill..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value} className="bg-slate-800">
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div
            className={`lg:w-64 shrink-0 space-y-6 ${
              mobileFiltersOpen ? "block" : "hidden lg:block"
            }`}
          >
            {/* Categories */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Category
              </h3>
              <div className="space-y-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                      selectedCategory === cat
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Job Type */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400" />
                Job Type
              </h3>
              <div className="space-y-2">
                {types.map((t) => (
                  <label key={t} className="flex items-center gap-2.5 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => toggleType(t)}
                      className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                        selectedTypes.includes(t)
                          ? "bg-cyan-500 border-cyan-500"
                          : "bg-white/5 border-white/20"
                      }`}
                    >
                      {selectedTypes.includes(t) && <span className="text-white text-[10px]">✓</span>}
                    </button>
                    <span className="text-slate-300 text-sm">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Experience
              </h3>
              <div className="space-y-2">
                {experiences.map((e) => (
                  <label key={e} className="flex items-center gap-2.5 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => toggleExperience(e)}
                      className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                        selectedExperiences.includes(e)
                          ? "bg-cyan-500 border-cyan-500"
                          : "bg-white/5 border-white/20"
                      }`}
                    >
                      {selectedExperiences.includes(e) && <span className="text-white text-[10px]">✓</span>}
                    </button>
                    <span className="text-slate-300 text-sm">{e} Level</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Remote */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-400" />
                Work Mode
              </h3>
              <button
                type="button"
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all border ${
                  remoteOnly
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    : "text-slate-400 border-transparent hover:bg-white/5"
                }`}
              >
                {remoteOnly ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                Remote Only
              </button>
            </div>

            {/* Salary Range */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Salary Range
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="Min"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
                <span className="text-slate-500 text-sm">-</span>
                <input
                  type="number"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  placeholder="Max"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Clear */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white py-2.5 rounded-xl text-sm transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All Filters
              </button>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {mobileFiltersOpen && (
              <div className="lg:hidden flex items-center justify-between mb-4">
                <span className="text-slate-400 text-sm">{filtered.length} results</span>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-2 rounded-lg bg-white/5 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((job) => (
                  <div
                    key={job.id}
                    className="glass rounded-2xl p-5 border border-transparent hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                          <span className="text-cyan-400 font-bold text-xs">{job.logo}</span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-sm">{job.title}</h3>
                          <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {job.company}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSave(job.id)}
                        className={`p-2 rounded-lg transition-all ${
                          savedJobs.includes(job.id)
                            ? "bg-red-500/10 text-red-400"
                            : "bg-white/5 text-slate-400 hover:text-red-400"
                        }`}
                      >
                        <Heart
                          className="w-4 h-4"
                          fill={savedJobs.includes(job.id) ? "currentColor" : "none"}
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {job.currency}
                        {job.salary.toLocaleString()} - {job.salaryMax.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.type}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{job.postedAt}</span>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all"
                      >
                        View Job
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 font-medium mb-1">No jobs found</p>
                <p className="text-slate-500 text-sm mb-6">Try adjusting your filters</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2 rounded-xl text-sm transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
