"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error?.digest || error?.message || error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center border border-red-500/15 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          An unexpected error occurred. You can try again or return home.
        </p>
        {error?.digest ? (
          <p className="text-[11px] text-slate-500 mb-4 font-mono">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-95"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white w-full py-2.5 rounded-xl text-sm font-medium border border-white/10 transition-all"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
