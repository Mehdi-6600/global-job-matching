"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JobCard } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Briefcase } from "lucide-react";

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

export default function JobsPage() {  // ← این خط رو چک کنید
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [usingSample, setUsingSample] = useState(false);

  const loadJobs = async (searchTitle: string, searchLocation: string) => {
    setLoading(true);
    setError(false);
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
      company: "Tech Corp",
      location: "Remote",
      salary: "$120k/year",
      description: "We are looking for a Senior React Developer with 5+ years of experience.",
      url: "https://example.com",
      source: "remoteok",
      postedAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Full Stack Engineer",
      company: "Startup Inc",
      location: "Berlin, Germany",
      salary: "$90k/year",
      description: "Join our team as a Full Stack Engineer. Work with React, Node.js, and AWS.",
      url: "https://example.com",
      source: "arbeitnow",
      postedAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "DevOps Engineer",
      company: "Cloud Solutions",
      location: "Remote",
      salary: "$110k/year",
      description: "Looking for a DevOps Engineer with Kubernetes and Docker experience.",
      url: "https://example.com",
      source: "jooble",
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
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Find Your Dream Job</h1>
        <p className="text-blue-100 mb-6">Discover opportunities tailored to your skills</p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Job title, keywords..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:bg-white/20"
            />
          </div>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="City, country, or remote..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:bg-white/20"
            />
          </div>
          <Button type="submit" className="bg-white text-blue-600 hover:bg-blue-50">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-muted-foreground">Loading jobs...</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {matches.length} {matches.length === 1 ? "Job" : "Jobs"} Available
            </h2>
            {usingSample && (
              <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                ⚠️ Using sample data
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
  );
}
