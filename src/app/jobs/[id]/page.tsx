"use client";

import { useParams } from "next/navigation";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Globe,
  Heart,
  Share2,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Users,
} from "lucide-react";
import Link from "next/link";

interface JobDetail {
  id: string;
  title: string;
  company: string;
  companyDescription: string;
  location: string;
  type: string;
  salary: string;
  postedAt: string;
  description: string;
  requirements: string[];
  benefits: string[];
  tags: string[];
  isRemote: boolean;
  applicants: number;
}

const jobDetails: Record<string, JobDetail> = {
  "1": {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp Global",
    companyDescription:
      "TechCorp Global is a leading technology company specializing in building scalable web applications for enterprise clients. With over 500 employees worldwide, we are committed to innovation and excellence.",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$120k - $160k",
    postedAt: "2 days ago",
    description:
      "We are seeking an experienced Senior Frontend Developer to join our dynamic engineering team. You will be responsible for building and maintaining complex web applications using modern technologies.",
    requirements: [
      "5+ years of experience with React and modern JavaScript",
      "Strong proficiency in TypeScript and Next.js",
      "Experience with state management (Redux, Zustand, or Context API)",
      "Deep understanding of CSS, Tailwind CSS, and responsive design",
      "Experience with testing frameworks (Jest, React Testing Library)",
      "Bachelor's degree in Computer Science or equivalent experience",
    ],
    benefits: [
      "Competitive salary and equity package",
      "Health, dental, and vision insurance",
      "Unlimited PTO policy",
      "Remote-first work environment",
      "Annual learning budget ($2,000)",
      "Home office stipend",
    ],
    tags: ["React", "Next.js", "TypeScript", "Tailwind"],
    isRemote: true,
    applicants: 42,
  },
  "2": {
    id: "2",
    title: "Backend Engineer",
    company: "DataFlow Systems",
    companyDescription:
      "DataFlow Systems builds real-time data processing platforms for Fortune 500 companies.",
    location: "New York, NY",
    type: "Full-time",
    salary: "$130k - $170k",
    postedAt: "1 day ago",
    description:
      "Join our backend team to design and implement high-performance APIs and microservices.",
    requirements: [
      "4+ years of experience with Node.js or Python",
      "Strong understanding of PostgreSQL and database optimization",
      "Experience with AWS services (EC2, S3, Lambda, RDS)",
      "Knowledge of Docker and Kubernetes",
    ],
    benefits: [
      "Competitive compensation",
      "401(k) matching",
      "Flexible working hours",
      "Team retreats twice a year",
    ],
    tags: ["Node.js", "PostgreSQL", "AWS", "Docker"],
    isRemote: true,
    applicants: 28,
  },
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const job = jobDetails[jobId] || jobDetails["1"];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to jobs
        </Link>

        {/* Header Card */}
        <div className="glass rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                <Briefcase className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    {job.company}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {job.isRemote ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    {job.isRemote ? "Remote" : "On-site"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {job.postedAt}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-3 rounded-xl glass hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                <Heart className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-xl glass hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20">
                Apply Now
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/10">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 border border-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-4">About the Role</h2>
              <p className="text-slate-300 leading-relaxed mb-6">{job.description}</p>

              <h3 className="text-lg font-semibold text-white mb-3">Requirements</h3>
              <ul className="space-y-3">
                {job.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-4">Benefits</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {job.benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Job Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Salary</p>
                    <p className="text-white font-medium text-sm">{job.salary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Job Type</p>
                    <p className="text-white font-medium text-sm">{job.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Posted</p>
                    <p className="text-white font-medium text-sm">{job.postedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Applicants</p>
                    <p className="text-white font-medium text-sm">{job.applicants} applied</p>
                  </div>
                </div>
              </div>

              <button className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20">
                Apply for this Position
              </button>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{job.company}</h3>
                  <p className="text-xs text-slate-400">Technology</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                {job.companyDescription}
              </p>
              <button className="w-full py-2.5 rounded-xl glass border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium">
                View Company Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
