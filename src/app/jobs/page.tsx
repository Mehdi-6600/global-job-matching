import { db } from "@/lib/db";

export default async function JobsPage() {
  const jobs = await db.jobListing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

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
                  <p className="text-sm text-muted-foreground">{job.city}, {job.country}</p>
                </div>
                <span className="text-xs bg-secondary px-2 py-1 rounded">{job.jobType}</span>
              </div>
              <p className="mt-2 text-sm line-clamp-2">{job.description}</p>
              {job.salaryMin && (
                <p className="mt-2 text-sm font-medium">
                  ${job.salaryMin.toString()} - ${job.salaryMax?.toString() || "?"} {job.salaryCurrency}/{job.salaryPeriod}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
