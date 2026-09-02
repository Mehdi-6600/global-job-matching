"use client";

import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

type Props = {
  message: string;
  code?: string;
  onClose?: () => void;
};

export function PlanLimitBanner({ message, code, onClose }: Props) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3 items-start">
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-amber-50 leading-relaxed">{message}</p>
        {code && (
          <p className="text-xs text-amber-200/70 font-mono">{code}</p>
        )}
        <Link
          href="/pricing"
          className="inline-flex text-cyan-300 hover:text-cyan-200 font-medium text-sm"
        >
          View plans & upgrade →
        </Link>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-amber-200/70 hover:text-white shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Parse API JSON error into a plan-limit friendly message.
 */
export function getPlanLimitFromResponse(data: unknown): {
  message: string;
  code?: string;
} | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const code = typeof obj.code === "string" ? obj.code : undefined;
  if (!code?.startsWith("PLAN_LIMIT_")) return null;
  const message =
    typeof obj.error === "string"
      ? obj.error
      : "You have reached a plan limit. Upgrade to continue.";
  return { message, code };
}
