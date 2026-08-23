import Link from "next/link";
import { Ghost, Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="glass rounded-3xl p-10 max-w-lg w-full text-center border border-white/5">
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto">
            <Ghost className="w-12 h-12 text-cyan-400" />
          </div>
          <span className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center text-sm font-bold">
            404
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved. Check the URL or go back home.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" />
            Back Home
          </Link>
          <Link
            href="/jobs"
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-6 py-2.5 rounded-xl text-sm transition-all w-full sm:w-auto justify-center"
          >
            <Search className="w-4 h-4" />
            Browse Jobs
          </Link>
        </div>

        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs mt-6 mx-auto transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Go back to previous page
        </button>
      </div>
    </main>
  );
}
