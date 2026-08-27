"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Users,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
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
    avatar: string | null;
    title: string | null;
    location: string | null;
    resumeUrl: string | null;
    bio: string | null;
  };
}

export default function ApplicantsPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [applications, setApplications] = useState<Applicant[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jobId) return;

    fetch(`/api/jobs/${jobId}/applicants`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load");
          setLoading(false);
          return;
        }
        setApplications(data.applications || []);
        setJobTitle(data.job?.title || "");
        setLoading(false);
      })
      .catch(() => {
        setError("Network error");
        setLoading(false);
      });
  }, [jobId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard/employer"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employer
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Users className="w-7 h-7 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Applicants</h1>
            <p className="text-slate-400 text-sm">
              {jobTitle || "Job"} · {applications.length} application
              {applications.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {applications.length === 0 && !error ? (
          <div className="glass rounded-2xl p-12 text-center border border-white/10">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No applicants yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="glass rounded-2xl p-5 border border-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-white font-semibold">
                      {app.user.name || "Applicant"}
                    </h3>
                    {app.user.title && (
                      <p className="text-slate-400 text-sm">{app.user.title}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
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
                      {app.user.resumeUrl && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {app.user.resumeUrl}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {app.status}
                  </span>
                </div>
                {app.coverLetter && (
                  <p className="mt-4 text-sm text-slate-300 border-t border-white/5 pt-4">
                    {app.coverLetter}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
