"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-28">
        <h1 className="text-5xl font-bold tracking-tight max-w-2xl">
          Find Your Next Job Anywhere
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-lg">
          Global job matching powered by AI. Free to start.
        </p>
        <div className="mt-10 flex gap-4">
          <Button asChild size="lg">
            <Link href="/jobs">Browse Jobs</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </section>

      {/* Jobs Preview */}
      <section className="border-t py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold">Jobs</h2>
          <p className="text-muted-foreground mt-1">Active listings near you</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
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
      </section>

      {/* Register Form */}
      <section className="border-t py-16 px-4">
        <div className="max-w-sm mx-auto">
          <h2 className="text-2xl font-bold mb-6">Create Account</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <input className="w-full border rounded-md px-3 py-2 mt-1" placeholder="John Doe" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input className="w-full border rounded-md px-3 py-2 mt-1" placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input type="password" className="w-full border rounded-md px-3 py-2 mt-1" placeholder="********" />
            </div>
            <Button className="w-full">Create Account</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

const jobs = [
  { title: "Line Supervisor", location: "Newaygo, MI, United States", type: "Full-time", salary: "$19/hr" },
  { title: "Operations Coordinator", location: "Muskegon, MI, United States", type: "Full-time", salary: "$21/hr" },
  { title: "Shift Lead, Distribution", location: "Grand Rapids, MI, United States", type: "Full-time", salary: "$20/hr" },
  { title: "Warehouse Supervisor", location: "Remote OK", type: "Remote", salary: "$18/hr" },
];
