"use client";

import { JobMatch } from "@/lib/jobs/matcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface JobCardProps {
  match: JobMatch; // ← این رو اضافه کنید
}

export function JobCard({ match }: JobCardProps) {
  const { job, score, matchReasons } = match;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <h3 className="font-semibold">{job.title}</h3>
      <p className="text-sm text-muted-foreground">{job.company}</p>
      <p className="text-sm">{job.location}</p>
      {matchReasons && matchReasons.length > 0 && (
        <div className="mt-2">
          {matchReasons.map((reason, i) => (
            <Badge key={i} variant="secondary" className="mr-1">
              {reason}
            </Badge>
          ))}
        </div>
      )}
      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={() => window.open(job.url, "_blank")}>
          View Job
        </Button>
      </div>
    </div>
  );
}
