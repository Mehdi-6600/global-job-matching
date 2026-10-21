"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  ArrowLeft,
  Loader2,
  ExternalLink,
  MapPin,
  Phone,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface Interview {
  id: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  notes: string | null;
  meetLink: string | null;
  job: {
    id: string;
    title: string;
    company: { name: string };
  };
}

export default function MyInterviewsPage() {
  const { t, locale } = useLocale();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  const typeIcons: Record<string, React.ReactNode> = {
    video: <Video className="w-4 h-4" />,
    phone: <Phone className="w-4 h-4" />,
    "in-person": <MapPin className="w-4 h-4" />,
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: {
      label: t("Common.loading", "Upcoming"),
      color: "text-amber-400 bg-amber-500/10",
    },
    completed: {
      label: t("Common.success", "Completed"),
      color: "text-emerald-400 bg-emerald-500/10",
    },
    cancelled: {
      label: t("Common.cancel", "Cancelled"),
      color: "text-red-400 bg-red-500/10",
    },
  };

  useEffect(() => {
    fetch("/api/interviews")
      .then((r) => r.json())
      .then((data) => {
        setInterviews(data.interviews || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="glass rounded-2xl p-6 mb-6 border border-white/10">
          <div className="flex items-center gap-3">
            <Calendar className="w-7 h-7 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">
                {t("Nav.dashboard", "My Interviews")}
              </h1>
              <p className="text-slate-400 text-sm">
                {t("Dashboard.welcomeSub", "Your scheduled interviews")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {interviews.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-white/10">
              <Calendar className="w-14 h-14 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {t("Common.noResults", "No interviews yet")}
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {t(
                  "Jobs.subtitle",
                  "Apply to jobs and employers will schedule interviews"
                )}
              </p>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm"
              >
                {t("Home.ctaJobs", "Browse Jobs")}
              </Link>
            </div>
          ) : (
            interviews.map((iv) => {
              const date = new Date(iv.scheduledAt);
              const st =
                statusConfig[iv.status] || statusConfig.scheduled;
              const isUpcoming =
                iv.status === "scheduled" && date >= new Date();

              return (
                <div
                  key={iv.id}
                  className="glass rounded-2xl p-5 border border-white/10"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white font-medium">
                          {iv.job.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">
                        {iv.job.company.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{" "}
                          {date.toLocaleDateString(locale)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{" "}
                          {date.toLocaleTimeString(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          {typeIcons[iv.type] || (
                            <Video className="w-3 h-3" />
                          )}{" "}
                          {iv.duration} min
                        </span>
                      </div>
                      {iv.notes && (
                        <p className="text-slate-500 text-xs mt-3 p-3 rounded-lg bg-white/5">
                          {iv.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {iv.meetLink && isUpcoming && (
                        <a
                          href={iv.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />{" "}
                          {t("Common.view", "Join")}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />{" "}
            {t("Common.back", "Back to Dashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
