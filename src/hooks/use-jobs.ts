"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function useJobs(query?: string, location?: string): UseJobsReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** آخرین درخواست را نگه می‌دارد تا در صورت نیاز لغو شود. */
  const abortRef = useRef<AbortController | null>(null);

  /** نشان می‌دهد کامپوننت هنوز mount است (جلوگیری از setState پس از unmount). */
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const fetchJobs = useCallback(async () => {
    // لغو درخواست قبلی (در صورت وجود) برای جلوگیری از race condition
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      // NOTE: /api/jobs expects `search` (not `q`).
      if (query) params.set("search", query);
      if (location) params.set("location", location);

      const res = await fetch(`/api/jobs?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      const data = (await res.json()) as {
        jobs?: Job[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch jobs");
      }

      if (!mountedRef.current) return;

      // فقط اگر پاسخ واقعاً آرایه بود، state را به‌روزرسانی کن
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (err: unknown) {
      // Abort خطا نیست — نتیجهٔ لغو عمدی است
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      if (!mountedRef.current) return;

      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setJobs([]);
    } finally {
      if (mountedRef.current && abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [query, location]);

  useEffect(() => {
    fetchJobs();
    // در cleanup، درخواست در حال اجرا لغو می‌شود
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}
