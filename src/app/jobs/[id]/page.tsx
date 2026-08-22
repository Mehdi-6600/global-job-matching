import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import {
  MapPin,
  DollarSign,
  Clock,
  ChevronLeft,
} from "lucide-react";

const prisma = new PrismaClient();

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.jobListing.findUnique({
    where: { id: id, status: "ACTIVE" },
    include: {
      employer: {
        select: {
          name: true,
          profile: {
            select: {
              companyName: true,
              companyWebsite: true,
            },
          },
        },
      },
    },
  });

  if (!job) return notFound();

  const companyName =
    job.employer.profile?.companyName || job.employer.name || "Company";

  function formatSalary() {
    if (!job.salaryMin && !job.salaryMax) return "Negotiable";
    const min = job.salaryMin
      ? `$${Number(job.salaryMin).toLocaleString()}`
      : "";
    const max = job.salaryMax
      ? `$${Number(job.salaryMax).toLocaleString()}`
      : "";
    if (min && max)
      return `${min} - ${max} ${job.salaryCurrency}/${job.salaryPeriod}`;
    return `${min || max} ${job.salaryCurrency}/${job.salaryPeriod}`;
  }

  function timeAgo() {
    const diff = Date.now() - new Date(job.createdAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Posted today";
    if (days === 1) return "Posted 1 day ago";
    return `Posted ${days} days ago`;
  }

  function jobTypeLabel() {
    return job.jobType.replace("_", "-");
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to jobs
        </Link>

        {/* Header Card */}
        <div className="glass-card mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-xl shadow-glow shrink-0">
              {companyName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                {job.title}
              </h1>
              <p className="text-[var(--text-muted)] mt-1">{companyName}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <span className="glass-pill text-xs uppercase">
              {jobTypeLabel()}
            </span>
            {job.isRemote && (
              <span className="glass-pill text-xs bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] border-[var(--ios-blue)]/20">
                Remote
              </span>
            )}
            <span className="glass-pill text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.isRemote ? "Remote" : `${job.city}, ${job.country}`}
            </span>
            <span className="glass-pill text-xs flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {formatSalary()}
            </span>
            <span className="glass-pill text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo()}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {job.skillsRequired.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] border border-[var(--ios-blue)]/20"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="glass-card mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
            About this role
          </h2>
          <p className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
            {job.description}
          </p>
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div className="glass-card mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Requirements
            </h2>
            <p className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
              {job.requirements}
            </p>
          </div>
        )}

        {/* Contact */}
        <div className="glass-card mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
            Contact
          </h2>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {job.contactName && <p>Contact: {job.contactName}</p>}
            <p>Email: {job.contactEmail}</p>
            {job.contactPhone && <p>Phone: {job.contactPhone}</p>}
          </div>
        </div>

        {/* Apply Button */}
        <button className="btn-primary w-full py-4 text-base">
          Apply Now
        </button>
      </div>
    </main>
  );
}
