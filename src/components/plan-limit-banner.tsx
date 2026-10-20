"use client";

import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type Props = {
  message: string;
  code?: string;
  onClose?: () => void;
};

export function PlanLimitBanner({ message, code, onClose }: Props) {
  const { t } = useLocale();

  return (
    <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)] flex gap-3 items-start">
      <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-[var(--warning)] leading-relaxed">{message}</p>
        {code && (
          <p className="text-xs text-[var(--warning)] font-mono">{code}</p>
        )}
        <Link
          href="/pricing"
          className="inline-flex text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] font-medium text-sm"
        >
          {t("Common.upgrade", "View plans & upgrade")} →
        </Link>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--warning)] hover:text-[var(--text-primary)] shrink-0"
          aria-label={t("Common.cancel", "Dismiss")}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

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
