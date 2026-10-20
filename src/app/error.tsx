"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    console.error("[app-error]", error?.digest || error?.message || error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center border border-[var(--error)] shadow-xl">
        <div className="w-16 h-16 rounded-full bg-[var(--error-soft)] border border-[var(--error)] flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-[var(--error)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          {t("Common.error", "Something went wrong")}
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
          {t(
            "Common.errorUnexpected",
            "An unexpected error occurred. You can try again or return home."
          )}
        </p>
        {error?.digest ? (
          <p className="text-[11px] text-[var(--text-muted)] mb-4 font-mono">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 bg-[image:var(--gradient-brand)] text-[var(--text-primary)] w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-95"
          >
            <RefreshCw className="w-4 h-4" />
            {t("Common.retry", "Try again")}
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-[var(--surface-3)] hover:bg-white/15 text-[var(--text-primary)] w-full py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] transition-all"
          >
            <Home className="w-4 h-4" />
            {t("Nav.home", "Go home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
