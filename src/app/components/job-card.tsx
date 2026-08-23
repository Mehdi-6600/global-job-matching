"use client";

import Link from "next/link";
import {
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Heart,
} from "lucide-react";

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  postedAt: string;
  tags: string[];
  logo: string;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}

export default function JobCard({
  id,
  title,
  company,
  location,
  type,
  salary,
  postedAt,
  tags,
  logo,
  saved = false,
  onToggleSave,
}: JobCardProps) {
  return (
    <div className="glass rounded-2xl p-5 border border-transparent hover:border-white/10 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 font-bold text-xs">{logo}</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{title}</h3>
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" />
              {company}
            </p>
          </div>
        </div>
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(id)}
            className={`p-2 rounded-lg transition-all ${
              saved
                ? "bg-red-500/10 text-red-400"
                : "bg-white/5 text-slate-400 hover:text-red-400"
            }`}
          >
            <Heart className="w-4 h-4" fill={saved ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {location}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          {salary}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {type}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{postedAt}</span>
        <Link
          href={`/jobs/${id}`}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all"
        >
          View Job
        </Link>
      </div>
    </div>
  );
}
