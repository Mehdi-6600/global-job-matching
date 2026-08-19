"use client";

import { JobCard } from "@/components/job-card";
import type { JobMatch } from "@/lib/jobs/matcher";

export default function JobsPage() {
  // Dummy data برای test
  const dummyMatches: JobMatch[] = [
    {
      job: {
        id: "test-1",
        title: "Software Engineer",
        company: "Tech Corp",
        location: "New York, NY",
        salary: "$100,000/year",
        description: "We are looking for a talented software engineer to join our team",
        url: "https://example.com/job1",
        source: "arbeitnow",
        postedAt: new Date(),
      },
      score: 85,
      matchReasons: ["Skills match", "Location match"],
    },
    {
      job: {
        id: "test-2",
        title: "Product Manager",
        company: "StartUp Inc",
        location: "San Francisco, CA",
        salary: "$120,000/year",
        description: "Join us as a Product Manager to lead amazing projects",
        url: "https://example.com/job2",
        source: "jooble",
        postedAt: new Date(),
      },
      score: 72,
      matchReasons: ["Title match"],
    },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Find Your Next Job
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          AI-powered job matching from global sources
        </p>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Sample Jobs (Test Mode)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dummyMatches.map((match) => (
              <JobCard key={match.job.id} match={match} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
