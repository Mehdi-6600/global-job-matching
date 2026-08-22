import Link from "next/link";
import { MapPin, DollarSign, Briefcase } from "lucide-react";

const jobs = [
  {
    id: "1",
    title: "DevOps Engineer",
    company: "CloudScale Systems",
    location: "London, United Kingdom",
    type: "FULL_TIME",
    salary: "$90000 - $120000",
    currency: "GBP",
    period: "yearly",
    description: "We need a DevOps Engineer to manage our cloud infrastructure.",
  },
  {
    id: "2",
    title: "Full Stack Engineer",
    company: "NexGen Startup",
    location: "Remote, Germany",
    type: "FULL_TIME",
    salary: "$70000 - $95000",
    currency: "EUR",
    period: "yearly",
    description: "Join our fast-growing startup as a Full Stack Engineer.",
  },
  {
    id: "3",
    title: "Senior React Developer",
    company: "BerlinTech GmbH",
    location: "Berlin, Germany",
    type: "FULL_TIME",
    salary: "$85000 - $115000",
    currency: "EUR",
    period: "yearly",
    description: "We're looking for a Senior React Developer to join our remote team.",
  },
];

export default function JobsPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-[var(--ios-blue)]" />
          Available Jobs
        </h1>
        <p className="text-[var(--text-muted)] mb-8">Find your next opportunity</p>

        <div className="grid gap-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="glass-card hover-glow block group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--ios-blue)] transition">
                    {job.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{job.company}</p>
                </div>
                <span className="glass-pill shrink-0">{job.type.replace("_", "-")}</span>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-[var(--text-muted)] mb-3">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> {job.salary} {job.currency}/{job.period}</span>
              </div>

              <p className="text-sm text-[var(--text-secondary)]">{job.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
