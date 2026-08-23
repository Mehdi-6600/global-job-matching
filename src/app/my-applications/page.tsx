"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Search,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  CheckCircle2,
  Eye,
  MessageSquare,
  XCircle,
  UserCheck,
  RotateCcw,
} from "lucide-react";
import EmptyState from "../components/empty-state";
import Skeleton from "../components/skeleton";

type ApplicationStatus = "applied" | "viewed" | "interview" | "rejected" | "hired";

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  appliedAt: string;
  status: ApplicationStatus;
  logo: string;
  lastUpdate: string;
}

const initialApplications: Application[] = [
  {
    id: "a1", jobTitle: "Senior Frontend Developer", company: "TechCorp",
    location: "Remote", salary: "$120k - $150k", appliedAt: "Aug 18, 2026",
    status: "interview", logo: "TC", lastUpdate: "2 days ago",
  },
  {
    id: "a2", jobTitle: "Backend Engineer", company: "CloudScale",
    location: "London, UK", salary: "£80k - £100k", appliedAt: "Aug 15, 2026",
    status: "viewed", logo: "CS", lastUpdate: "1 day ago",
  },
  {
    id: "a3", jobTitle: "Product Designer", company: "Creative Studio",
    location: "Paris, France", salary: "€60k - €80k", appliedAt: "Aug 10, 2026",
    status: "applied", logo: "CR", lastUpdate: "Just now",
  },
  {
    id: "a4", jobTitle: "DevOps Engineer", company: "DataFlow",
    location: "Berlin, Germany", salary: "€90k - €110k", appliedAt: "Aug 05, 2026",
    status: "rejected", logo: "DF", lastUpdate: "3 days ago",
  },
  {
    id: "a5", jobTitle: "Mobile Developer", company: "NextGen Labs",
    location: "Toronto, Canada", salary: "$100k - $130k", appliedAt: "Jul 28, 2026",
    status: "hired", logo: "NG", lastUpdate: "Yesterday",
  },
];

const statusConfig: Record<
  ApplicationStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  applied: { label: "Applied", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", icon: Send },
  viewed: { label: "Viewed", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Eye },
  interview: {
    label: "Interview",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    icon: MessageSquare,
  },
  rejected: { label: "Rejected", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
  hired: {
    label: "Hired",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: UserCheck,
  },
};

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | ApplicationStatus>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setApplications(initialApplications);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      app.company.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || app.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: applications.length,
    applied: applications.filter((a) => a.status === "applied").length,
    viewed: applications.filter((a) => a.status === "viewed").length,
    interview: applications.filter((a) => a.status === "interview").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    hired: applications.filter((a) => a.status === "hired").length,
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-12 rounded-2xl mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">My Applications</h1>
            <p className="text-slate-400 text-sm">Track your job applications</p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-8">
          {([
            { key: "all", label: "All", color: "text-white" },
            { key: "applied", label: "Applied", color: "text-cyan-400" },
            { key: "viewed", label: "Viewed", color: "text-blue-400" },
            { key: "interview", label: "Interview", color: "text-purple-400" },
            { key: "rejected", label: "Rejected", color: "text-red-400" },
            { key: "hired", label: "Hired", color: "text-emerald-400" },
          ] as const).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setFilterStatus(s.key as any)}
              className={`glass rounded-2xl p-3 text-center transition-all border ${
                filterStatus === s.key
                  ? "border-cyan-500/30 bg-cyan-500/5"
                  : "border-transparent hover:border-white/10"
              }`}
            >
              <p className={`text-lg font-bold ${s.color}`}>{counts[s.key as keyof typeof counts]}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applications..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((app) => {
              const config = statusConfig[app.status];
              const StatusIcon = config.icon;
              return (
                <div
                  key={app.id}
                  className="glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-transparent hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <span className="text-cyan-400 font-bold text-sm">{app.logo}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{app.jobTitle}</h3>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {app.company}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {app.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {app.salary}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Applied {app.appliedAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <span
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${config.color}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {config.label}
                    </span>
                    <span className="text-[10px] text-slate-500">Updated {app.lastUpdate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Send}
            title={search ? "No matching applications" : "No applications yet"}
            description={
              search
                ? "Try different search terms"
                : "Start applying to jobs to track them here."
            }
            action={
              search
                ? { label: "Clear Search", onClick: () => setSearch("") }
                : undefined
            }
          />
        )}
      </div>
    </main>
  );
}
