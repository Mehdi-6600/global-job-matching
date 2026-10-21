import type { Metadata } from "next";
import Link from "next/link";
import { Home, Briefcase, MapPin, Layers, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="glass rounded-2xl p-10 max-w-lg w-full text-center border border-white/10 shadow-xl">
        <p className="text-6xl font-bold text-sky-400 mb-3">404</p>
        <h1 className="text-2xl font-semibold text-white mb-2">
          Page not found
        </h1>
        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
          This page does not exist or was moved. Try one of these popular
          sections:
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-5 py-2.5 rounded-xl border border-white/10 transition-all"
          >
            <Briefcase className="w-4 h-4" />
            Jobs
          </Link>
          <Link
            href="/locations"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-5 py-2.5 rounded-xl border border-white/10 transition-all"
          >
            <MapPin className="w-4 h-4" />
            Locations
          </Link>
          <Link
            href="/categories"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-5 py-2.5 rounded-xl border border-white/10 transition-all"
          >
            <Layers className="w-4 h-4" />
            Categories
          </Link>
          <Link
            href="/career-risk"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-5 py-2.5 rounded-xl border border-white/10 transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            Career Risk
          </Link>
        </div>
      </div>
    </main>
  );
}
