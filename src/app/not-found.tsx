import Link from "next/link";
import { ArrowLeft, Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <div className="text-[120px] font-bold text-white/5 leading-none select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-16 h-16 text-indigo-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link
            href="/jobs"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-medium transition-all w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" /> Browse Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
