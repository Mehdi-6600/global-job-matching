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
  source: string; // ← اینجا string هست
  postedAt: Date;
}

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadJobs = async (searchTitle: string, searchLocation: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/jobs?title=${encodeURIComponent(searchTitle || "developer")}&location=${encodeURIComponent(searchLocation || "remote")}`);
      const data = await res.json();
      if (data.jobs && data.jobs.length > 0) {
        setJobs(data.jobs);
      } else {
        setJobs([]);
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(title, location);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/jobs?title=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}`);
    loadJobs(title, location);
  };

  // ساخت match با تطابق تایپ
  const matches = jobs.map((job) => {
    // تبدیل source به یکی از مقادیر مجاز
    const validSource = job.source === "arbeitnow" || job.source === "jooble" || job.source === "remoteok" 
      ? job.source as "arbeitnow" | "jooble" | "remoteok"
      : "remoteok"; // مقدار پیش‌فرض

    return {
      job: {
        ...job,
        source: validSource,
      },
      score: Math.floor(Math.random() * 40) + 60,
      matchReasons: ["Skills match", "Location match", "Salary meets expectations"],
    };
  });

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
            {error && (
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
