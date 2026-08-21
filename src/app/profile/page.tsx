import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Your Profile | Global Job Matching",
  description: "Manage your Global Job Matching profile.",
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* NAVBAR FIX: Branding updated from "GlobalJob" to "Global Job Matching" */}
        <nav className="flex items-center justify-between mb-8">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Global Job Matching
          </Link>
          <div className="flex gap-4">
            <Link href="/jobs" className="text-sm text-gray-600 hover:text-indigo-600">
              Jobs
            </Link>
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-indigo-600">
              Pricing
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">
              Dashboard
            </Link>
          </div>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h1>
          <form className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Professional Title
              </label>
              <input
                id="title"
                type="text"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="e.g. Senior React Developer"
              />
            </div>
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                Skills (comma separated)
              </label>
              <input
                id="skills"
                type="text"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="React, TypeScript, Node.js"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="United States"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="New York"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
                  Desired Salary (USD)
                </label>
                <input
                  id="salary"
                  type="number"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="100000"
                />
              </div>
              <div>
                <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Radius (km)
                </label>
                <input
                  id="radius"
                  type="number"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="50"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
            >
              Save Profile
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
