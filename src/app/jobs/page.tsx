import { fetchAllJobs } from "@/lib/jobs/fetcher";

export default async function JobsPage() {
  // دریافت مشاغل از APIهای خارجی
  const jobs = await fetchAllJobs("developer", "remote");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Available Jobs</h1>
      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No active listings yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{job.title}</h2>
                  <p className="text-sm text-muted-foreground">{job.location}</p>
                </div>
                <span className="text-xs bg-secondary px-2 py-1 rounded">{job.source}</span>
              </div>
              <p className="mt-2 text-sm line-clamp-2">{job.description}</p>
              {job.salary && (
                <p className="mt-2 text-sm font-medium">{job.salary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
