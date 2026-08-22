"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Clock, 
  Filter,
  ChevronDown,
  Heart,
  Globe
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  postedAt: string;
  description: string;
  tags: string[];
  isRemote: boolean;
  isFeatured?: boolean;
}

const mockJobs: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp Global",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$120k - $160k",
    postedAt: "2 days ago",
    description: "We are looking for an experienced Frontend Developer proficient in React, Next.js, and TypeScript to join our growing team.",
    tags: ["React", "Next.js", "TypeScript", "Tailwind"],
    isRemote: true,
    isFeatured: true,
  },
  {
    id: "2",
    title: "Backend Engineer",
    company: "DataFlow Systems",
    location: "New York, NY",
    type: "Full-time",
    salary: "$130k - $170k",
    postedAt: "1 day ago",
    description: "Build scalable APIs and microservices using Node.js and PostgreSQL. Experience with cloud platforms required.",
    tags: ["Node.js", "PostgreSQL", "AWS", "Docker"],
    isRemote: true,
  },
  {
    id: "3",
    title: "UI/UX Designer",
    company: "Creative Studio",
    location: "London, UK",
    type: "Contract",
    salary: "$80k - $110k",
    postedAt: "5 hours ago",
    description: "Design beautiful and intuitive user interfaces for web and mobile applications. Strong portfolio required.",
    tags: ["Figma", "UI Design", "Prototyping", "Mobile"],
    isRemote: false,
  },
  {
    id: "4",
    title: "DevOps Engineer",
    company: "CloudScale Inc",
    location: "Berlin, Germany",
    type: "Full-time",
    salary: "$110k - $150k",
    postedAt: "3 days ago",
    description: "Manage CI/CD pipelines, Kubernetes clusters, and cloud infrastructure. Terraform and Ansible experience preferred.",
    tags: ["Kubernetes", "Terraform", "AWS", "CI/CD"],
    isRemote: true,
  },
  {
    id: "5",
    title: "Product Manager",
    company: "StartupHub",
    location: "Austin, TX",
    type: "Full-time",
    salary: "$100k - $140k",
    postedAt: "1 week ago",
    description: "Lead product development from ideation to launch. Work closely with engineering, design, and marketing teams.",
    tags: ["Agile", "Product Strategy", "Analytics", "Leadership"],
    isRemote: true,
  },
  {
    id: "6",
    title: "Mobile Developer (React Native)",
    company: "AppWorks",
    location: "Toronto, Canada",
    type: "Part-time",
    salary: "$60k - $90k",
    postedAt: "4 days ago",
    description: "Develop cross-platform mobile applications using React Native. iOS and Android deployment experience required.",
    tags: ["React Native", "iOS", "Android", "Firebase"],
    isRemote: false,
  },
];

const jobTypes = ["All", "Full-time", "Part-time", "Contract", "Freelance"];
const locations = ["All Locations", "Remote", "On-site", "Hybrid"];

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredJobs = useMemo(() => {
    return mockJobs.filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === "All" || job.type === selectedType;
      
      const matchesLocation =
        selectedLocation === "All Locations" ||
        (selectedLocation === "Remote" && job.isRemote) ||
        (selectedLocation === "On-site" && !job.isRemote);

      return matchesSearch && matchesType && matchesLocation;
    });
  }, [searchQuery, selectedType, selectedLocation]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Find Your <span className="text-cyan-400">Dream Job</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Browse thousands of job opportunities from top companies around the world
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="glass rounded-2xl p-2 flex items-center gap-2 shadow-xl">
            <Search className="w-5 h-5 text-slate-400 ml-3" />
            <input
              type="text"
              placeholder="Search by job title, company, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none px-3 py-3"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden p-3 text-slate-300 hover:text-white transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
              Search
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`max-w-3xl mx-auto mb-10 ${showFilters ? "block" : "hidden md:block"}`}>
          <div className="flex flex-wrap gap-3 justify-center">
            {/* Job Type Filter */}
            <div className="relative group">
              <button className="glass rounded-xl px-4 py-2.5 text-slate-200 flex items-center gap-2 hover:bg-white/10 transition-colors">
                <Briefcase className="w-4 h-4" />
                {selectedType}
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-48 glass rounded-xl overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                {jobTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      selectedType === type
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div className="relative group">
              <button className="glass rounded-xl px-4 py-2.5 text-slate-200 flex items-center gap-2 hover:bg-white/10 transition-colors">
                <MapPin className="w-4 h-4" />
                {selectedLocation}
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-48 glass rounded-xl overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setSelectedLocation(loc)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      selectedLocation === loc
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count */}
            <div className="glass rounded-xl px-4 py-2.5 text-slate-300 text-sm flex items-center">
              <span className="text-cyan-400 font-semibold mr-1">{filteredJobs.length}</span> jobs found
            </div>
          </div>
        </div>

        {/* Job Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className={`glass rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group relative ${
                job.isFeatured ? "ring-2 ring-cyan-500/50" : ""
              }`}
            >
              {job.isFeatured && (
                <div className="absolute -top-3 left-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  FEATURED
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-cyan-400" />
                </div>
                <button
                  onClick={() => toggleFavorite(job.id)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      favorites.has(job.id) ? "fill-red-500 text-red-500" : "text-slate-400"
                    }`}
                  />
                </button>
              </div>

              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                {job.title}
              </h3>
              <p className="text-slate-400 text-sm mb-3">{job.company}</p>

              <p className="text-slate-300 text-sm mb-4 line-clamp-2">{job.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  {job.isRemote ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                  {job.isRemote ? "Remote" : "On-site"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <DollarSign className="w-3.5 h-3.5" />
                    {job.salary}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {job.postedAt}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {job.type}
                </span>
              </div>

              <button className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-2.5 rounded-xl font-medium transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0">
                Apply Now
              </button>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
            <p className="text-slate-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </main>
  );
}
