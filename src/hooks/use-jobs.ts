"use client";

import { useState, useEffect, useCallback } from "react";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  url: string;
  tags: string[];
  postedAt: string;
  source: "arbeitnow" | "remoteok" | "jooble";
}

interface UseJobsReturn {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useJobs(query?: string, location?: string): UseJobsReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (location) params.set("location", location);

      const res = await fetch(`/api/jobs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");
      setJobs(data.jobs);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [query, location]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}
