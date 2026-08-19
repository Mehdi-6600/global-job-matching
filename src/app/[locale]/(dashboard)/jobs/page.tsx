"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { JobCard } from "@/components/job-card";
import type { JobMatch } from "@/lib/jobs/matcher";

interface SearchStats {
  fetched: number;
  matched: number;
  matchPercentage: number;
  bySource: {
    arbeitnow: number;
    jooble: number;
    remoteok: number;
  };
}

export default function JobsPage() {
  const t = useTranslations("Jobs");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Parse skills from comma-separated input
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (!jobTitle.trim() || !location.trim() || skillsArray.length === 0) {
        setError("Please fill in all fields");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/jobs/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle.trim(),
          location: location.trim(),
          skills: skillsArray,
          salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
          radius: 50,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch jobs");
        setMatches([]);
        setStats(null);
      } else {
        setMatches(data.jobs || []);
        setStats(data.stats || null);
        if (data.jobs.length === 0) {
          setError("No matching jobs found. Try different criteria.");
        }
      }
    } catch (err) {
      setError("Error fetching jobs. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Find Your Next Job
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered job matching from global sources
          </p>
        </div>

        {/* Search Form */}
        <form
          onSubmit={handleSearch}
          className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Job Title */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Supervisor, Engineer"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Newaygo, MI"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g., supervision, logistics"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Min Salary */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Min Salary (optional)
              </label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="e.g., 50000"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Searching..." : "Search Jobs"}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Fetched</p>
              <p className="text-2xl font-bold text-foreground">{stats.fetched}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Matched</p>
              <p className="text-2xl font-bold text-foreground">{stats.matched}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Match Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.matchPercentage}%
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Sources</p>
              <p className="text-xs text-muted-foreground mt-2">
                Arbeitnow: {stats.bySource.arbeitnow} | Jooble:{" "}
                {stats.bySource.jooble} | RemoteOK: {stats.bySource.remoteok}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          </div>
        )}

        {/* Job Results Grid */}
        {!loading && matches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {matches.length} Matching Jobs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match) => (
                <JobCard key={match.job.id} match={match} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && matches.length === 0 && stats && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No jobs matched your criteria. Try adjusting your search.
            </p>
          </div>
        )}

        {/* Initial State */}
        {!loading && matches.length === 0 && !stats && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Fill in the form above to find matching jobs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
