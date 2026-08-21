import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Your Profile | Global Job Matching",
  description: "Manage your Global Job Matching profile.",
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <nav className="flex items-center justify-between mb-8">
          <Link href="/" className="text-xl font-bold text-[var(--ios-blue)]">
            Global Job Matching
          </Link>
          <div className="flex gap-4">
            <Link href="/jobs" className="text-sm text-[var(--text-secondary)] hover:text-[var(--ios-blue)] transition">
              Jobs
            </Link>
            <Link href="/pricing" className="text-sm text-[var(--text-secondary)] hover:text-[var(--ios-blue)] transition">
              Pricing
            </Link>
            <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--ios-blue)] transition">
              Dashboard
            </Link>
          </div>
        </nav>

        <div className="glass-card">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Your Profile</h1>
          <form className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Professional Title
              </label>
              <input
                id="title"
                type="text"
                className="glass-input w-full"
                placeholder="e.g. Senior React Developer"
              />
            </div>
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Skills (comma separated)
              </label>
              <input
                id="skills"
                type="text"
                className="glass-input w-full"
                placeholder="React, TypeScript, Node.js"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  className="glass-input w-full"
                  placeholder="United States"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  className="glass-input w-full"
                  placeholder="New York"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Desired Salary (USD)
                </label>
                <input
                  id="salary"
                  type="number"
                  className="glass-input w-full"
                  placeholder="100000"
                />
              </div>
              <div>
                <label htmlFor="radius" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Search Radius (km)
                </label>
                <input
                  id="radius"
                  type="number"
                  className="glass-input w-full"
                  placeholder="50"
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary"
            >
              Save Profile
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
