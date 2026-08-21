import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Global Job Matching",
  description: "Learn more about Global Job Matching and our mission.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
          About Global Job Matching
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed mb-6">
          Global Job Matching is an AI-powered platform built to connect talented professionals 
          with the best opportunities worldwide. Whether you are looking for your next remote role 
          or a local dream job, our smart matching algorithm ensures you never miss the right fit.
        </p>
        <p className="text-gray-600 text-lg leading-relaxed mb-8">
          Founded in 2024, we have helped thousands of job seekers and hundreds of companies 
          find each other faster, smarter, and with complete transparency.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-3xl font-bold text-indigo-600">500+</div>
            <div className="text-sm text-gray-500 mt-1">Companies</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-3xl font-bold text-indigo-600">10K+</div>
            <div className="text-sm text-gray-500 mt-1">Jobs Matched</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-3xl font-bold text-indigo-600">150+</div>
            <div className="text-sm text-gray-500 mt-1">Countries</div>
          </div>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          Browse Jobs
        </Link>
      </div>
    </main>
  );
}
