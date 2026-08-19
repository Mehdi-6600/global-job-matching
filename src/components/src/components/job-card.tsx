"use client";

import { JobMatch } from "@/lib/jobs/matcher";

interface JobCardProps {
  match: JobMatch;
}

export function JobCard({ match }: JobCardProps) {
  const { job, score, matchReasons } = match;

  return (
    <div className="border border-border rounded-lg p-5 bg-card hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.company}</p>
        </div>
        <div className="px-3 py-2 rounded-full font-bold text-sm bg-primary text-primary-foreground">
          {score}%
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        📍 {job.location}
        {job.salary && <span> • 💰 {job.salary}</span>}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{job.description}</p>

      <div className="flex gap-2 mb-4">
        {matchReasons.slice(0, 2).map((reason) => (
          <span key={reason} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
            ✓ {reason}
          </span>
        ))}
      </div>

      <button
        onClick={() => window.open(job.url, "_blank")}
        className="w-full px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90"
      >
        View Job
      </button>
    </div>
  );
}
