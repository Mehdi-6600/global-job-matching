"use client";

import { JobMatch } from "@/lib/jobs/matcher";

interface JobCardProps {
  match: JobMatch;
}

export function JobCard({ match }: JobCardProps) {
  const { job, score, matchReasons } = match;

  // Color coding for match score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 40) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getScoreBadgeBg = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-blue-100 text-blue-800";
    if (score >= 40) return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div
      className={`border-2 rounded-lg p-5 hover:shadow-lg transition-shadow ${getScoreColor(
        score
      )}`}
    >
      {/* Header with title and score */}
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
          <p className="text-sm text-muted-foreground font-medium">
            {job.company}
          </p>
        </div>
        <div
          className={`px-3 py-2 rounded-full font-bold text-sm whitespace-nowrap ${getScoreBadgeBg(
            score
          )}`}
        >
          {score}%
        </div>
      </div>

      {/* Location and salary */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span>📍</span>
          <span className="text-foreground font-medium">{job.location}</span>
        </div>
        {job.salary && (
          <div className="flex items-center gap-1.5">
            <span>💰</span>
            <span className="text-foreground font-semibold">{job.salary}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span>🔗</span>
          <span className="text-xs text-muted-foreground capitalize font-medium">
            from {job.source}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {job.description}
      </p>

      {/* Match reasons (tags) */}
      {matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {matchReasons.map((reason) => (
            <span
              key={reason}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
            >
              ✓ {reason}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => window.open(job.url, "_blank")}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 transition-opacity"
        >
          View Job
        </button>
        <button className="flex-1 px-4 py-2 border-2 border-border text-foreground font-semibold rounded-md hover:bg-accent transition-colors">
          Save
        </button>
      </div>

      {/* Posted date */}
      <p className="text-xs text-muted-foreground mt-3">
        Posted {new Date(job.postedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
