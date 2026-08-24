"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  Loader2,
  Mail,
  MapPin,
  Briefcase,
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

interface Applicant {
  id: string;
  status: string;
  coverLetter: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    title: string | null;
    location: string | null;
    avatar: string | null;
  };
}

const statusOptions = [
  { value: "applied", label: "Applied", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <Clock className="w-3.5 h-3.5" /> },
  { value: "viewed", label: "Viewed", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: <UserCheck className="w-3.5 h-3.5" /> },
  { value: "interview", label: "Interview", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", icon: <Users className="w-3.5 h-3.5" /> },
  { value: "rejected", label: "Rejected", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: <XCircle className="w-3.5 h-3.5" /> },
  { value: "hired", label: "Hired", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  return "Today";
}

export default function JobApplicantsPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/applicants`)
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) {
          setApplicants(data.applications);
        } else if (data.error) {
          setError(data.error);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load applicants");
        setLoading(false);
      });
  }, [jobId]);

  const updateStatus = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setApplicants((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusConfig = (status: string) =>
    statusOptions.find((s) => s.value === status) || statusOptions[0];

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading applicants...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/employer" className="text-cyan-400 text-sm hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/employer"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employer Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="w-7 h-7 text-cyan-400" />
            Applicants
          </h1>
          <p className="text-slate-400 text-sm">
            {applicants.length} application{applicants.length !== 1 ? "s" : ""} received
          </p>
        </div>

        {applicants.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-1">No applicants yet</p>
            <p className="text-slate-400 text-sm">Applications will appear here when candidates apply.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applicants.map((app) => {
              const status = getStatusConfig(app.status);
              return (
                <div key={app.id} className="glass rounded-2xl p-5 md:p-6 border border-transparent hover:border-white/10 transition-all">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(app.user.name || "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-base">{app.user.name || "Unknown"}</h3>
                        <p className="text-slate-400 text-xs mt-0.5">{app.user.title || "No title"}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {app.user.email}
                          </span>
                          {app.user.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {app.user.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(app.createdAt)}
                          </span>
                        </div>
                        {app.coverLetter && (
                          <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-slate-300 text-xs leading-relaxed">{app.coverLetter}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <select
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                          disabled={updatingId === app.id}
                          className={`appearance-none pl-3 pr-8 py-2 rounded-xl text-xs font-medium border outline-none transition-all ${
                            status.color
                          } ${updatingId === app.id ? "opacity-50" : ""}`}
                        >
                          {statusOptions.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50" />
                      </div>
                      {updatingId === app.id && (
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
