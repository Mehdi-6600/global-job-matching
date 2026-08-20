"use client";

import { JobMatch } from "@/lib/jobs/matcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, DollarSign, Clock, Zap } from "lucide-react";

interface JobCardProps {
  match: JobMatch;
}

export function JobCard({ match }: JobCardProps) {
  const { job, score, matchReasons } = match;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  // نمایش منبع به صورت خوانا
  const getSourceLabel = (source: string) => {
    switch (source) {
      case "arbeitnow": return "Arbeitnow";
      case "jooble": return "Jooble";
      case "remoteok": return "RemoteOK";
      case "direct": return "Direct";
      default: return source;
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1">
      <div className="relative h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-xl font-bold text-gray-900 leading-tight">
            {job.title}
          </h3>
          <div className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(score)}`}>
            {score}%
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Briefcase className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{job.company || "Unknown Company"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{job.location}</span>
          </div>
          {job.salary && (
            <div className="flex items-center gap-2 text-emerald-700 font-medium">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-sm">{job.salary}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
          {job.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          {matchReasons.slice(0, 3).map((reason, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border-0 hover:bg-indigo-100 transition-colors"
            >
              <Zap className="w-3 h-3" />
              {reason}
            </Badge>
          ))}
          {matchReasons.length > 3 && (
            <Badge variant="outline" className="text-xs text-gray-500">
              +{matchReasons.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{new Date(job.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="capitalize">{getSourceLabel(job.source)}</span>
          </div>

          <Button
            onClick={() => window.open(job.url, "_blank")}
            className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <span>View Job</span>
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
