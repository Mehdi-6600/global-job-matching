"use client";

interface JobCardProps {
  job?: any;
  score?: number;
  matchReasons?: string[];
}

export function JobCard({ job, score, matchReasons }: JobCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <h3 className="font-semibold">{job?.title || "Job Title"}</h3>
      <p className="text-sm text-muted-foreground">{job?.company || "Company"}</p>
      <p className="text-sm text-muted-foreground">{job?.location || "Location"}</p>
    </div>
  );
}
