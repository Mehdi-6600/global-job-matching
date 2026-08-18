"use client";

import { useTranslations } from "next-intl";
import { Navbar } from "@/components/Navbar";

export default function JobsPage() {
  const t = useTranslations("Nav");

  const jobs = [
    { title: "Line Supervisor", location: "Newaygo, MI, United States", type: "Full-time", salary: "$19/hr" },
    { title: "Operations Coordinator", location: "Muskegon, MI, United States", type: "Full-time", salary: "$21/hr" },
    { title: "Shift Lead, Distribution", location: "Grand Rapids, MI, United States", type: "Full-time", salary: "$20/hr" },
    { title: "Warehouse Supervisor", location: "Remote OK", type: "Remote", salary: "$18/hr" },
  ];

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">{t("jobs")}</h1>
        <p className="text-muted-foreground mb-8">Active listings near you</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job, i) => (
            <div key={i} className="border rounded-lg p-5">
              <h3 className="font-semibold">{job.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{job.location}</p>
              <div className="flex gap-2 mt-4">
                <span className="text-xs bg-secondary px-3 py-1 rounded-full">{job.type}</span>
                <span className="text-xs bg-secondary px-3 py-1 rounded-full">{job.salary}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
