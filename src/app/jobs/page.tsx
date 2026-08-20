import { fetchAllJobs } from "@/lib/jobs/fetcher";
import { JobCard } from "@/components/job-card";
import { matchJobs, type UserProfile } from "@/lib/jobs/matcher";

export default async function JobsPage() {
  // دریافت مشاغل از APIهای خارجی
  const jobs = await fetchAllJobs("developer", "remote");

  // داده‌های نمونه برای تست
  const sampleJobs = [
    {
      id: "1",
      title: "Senior React Developer",
      company: "Tech Corp",
      location: "Remote",
      salary: "$120k/year",
      description: "We are looking for a Senior React Developer with 5+ years of experience.",
      url: "https://example.com",
      source: "sample" as const,
      postedAt: new Date(),
    },
    {
      id: "2",
      title: "Full Stack Engineer",
      company: "Startup Inc",
      location: "Berlin, Germany",
      salary: "$90k/year",
      description: "Join our team as a Full Stack Engineer. Work with React, Node.js, and AWS.",
      url: "https://example.com",
      source: "sample" as const,
      postedAt: new Date(),
    },
    {
      id: "3",
      title: "DevOps Engineer",
      company: "Cloud Solutions",
      location: "Remote",
      salary: "$110k/year",
      description: "Looking for a DevOps Engineer with Kubernetes and Docker experience.",
      url: "https://example.com",
      source: "sample" as const,
      postedAt: new Date(),
    },
  ];

  const displayJobs = jobs.length > 0 ? jobs : sampleJobs;

  // ایجاد match ساختگی برای هر شغل (برای تست)
  const matches = displayJobs.map((job) => ({
    job,
    score: Math.floor(Math.random() * 40) + 60, // امتیاز بین ۶۰ تا ۱۰۰
    matchReasons: ["Skills match", "Location match", "Salary meets expectations"],
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Available Jobs</h1>
      {matches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No active listings yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <JobCard key={match.job.id} match={match} />
          ))}
        </div>
      )}
      {jobs.length === 0 && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          ⚠️ Using sample data. API connection failed.
        </p>
      )}
    </div>
  );
}
