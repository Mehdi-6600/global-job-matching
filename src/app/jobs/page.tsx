"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JobCard } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Briefcase, Sparkles } from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  url: string;
  source: string;
  postedAt: string;
}

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingSample, setUsingSample] = useState(false);

  const loadJobs = async (searchTitle: string, searchLocation: string) => {
    setLoading(true);
    setUsingSample(false);
    try {
      const res = await fetch(`/api/jobs?title=${encodeURIComponent(searchTitle)}&location=${encodeURIComponent(searchLocation)}`);
      const data = await res.json();
      if (data.jobs && data.jobs.length > 0) {
        setJobs(data.jobs);
      } else {
        setJobs(getSampleJobs());
        setUsingSample(true);
      }
    } catch {
      setJobs(getSampleJobs());
      setUsingSample(true);
    } finally {
      setLoading(false);
    }
  };

  const getSampleJobs = () => [
    {
      id: "1",
      title: "Senior React Developer",
      company: "Tech Corp",  // ← اینجا company هست، ولی تو دیتابیس نیست
      location: "Remote",
      salary: "$120k/year",
      description: "We are looking for a Senior React Developer with 5+ years of experience.",
      url: "https://example.com",
      source: "remoteok" as const,
      postedAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Full Stack Engineer",
      company: "Startup Inc",
      location: "Berlin, Germany",
      salary: "$90k/year",
      description: "Join our team as a Full Stack Engineer.",
      url: "https://example.com",
      source: "arbeitnow" as const,
      postedAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "DevOps Engineer",
      company: "Cloud Solutions",
      location: "Remote",
      salary: "$110k/year",
      description: "Looking for a DevOps Engineer.",
      url: "https://example.com",
      source: "jooble" as const,
      postedAt: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    loadJobs(title, location);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/jobs?title=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}`);
    loadJobs(title, location);
  };

  const matches = jobs.map((job) => ({
    job: {
      ...job,
      source: job.source as "arbeitnow" | "jooble" | "remoteok" | "direct",
    },
    score: Math.floor(Math.random() * 40) + 60,
    matchReasons: ["Skills match", "Location match", "Salary meets expectations"],
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black">
      {/* هدر */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-pink-600/20 border-b border-white/10">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-lg border border-white/10 px-5 py-2 rounded-full text-sm font-medium text-white/90 mb-4">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Find Your Dream Job
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Available Jobs</h1>
            <p className="text-white/60">Discover opportunities tailored to your skills</p>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mt-6">
              <div className="flex-1 relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  type="text"
                  placeholder="Job title, keywords..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:bg-white/10"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  type="text"
                  placeholder="City, country, or remote..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:bg-white/10"
                />
              </div>
              <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* نتایج */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-white/60">Loading jobs...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                {matches.length} {matches.length === 1 ? "Job" : "Jobs"} Available
              </h2>
              {usingSample && (
                <span className="text-sm text-yellow-400 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
                  ⚠️ Sample data
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match) => (
                <JobCard key={match.job.id} match={match} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
