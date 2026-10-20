"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Crown, AlertTriangle } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type UsageBucket = { used: number; limit: number };

type UsagePayload = {
  plan: string;
  expired?: boolean;
  daysRemaining?: number | null;
  planExpiresAt?: string | null;
  usage: {
    applications: UsageBucket;
    savedJobs: UsageBucket;
    jobAlerts: UsageBucket;
    aiGenerations: UsageBucket;
    activeEmployerJobs: UsageBucket;
    pendingPayments: number;
    periodKey: string;
  };
};

// تابع کمکی برای جایگزینی متغیرها در متن ترجمه‌شده
function interpolate(template: string, replacements: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

function Bar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const near = pct >= 85;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--text-muted)]">
        <span>{label}</span>
        <span className={near ? "text-[var(--warning)]" : ""}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            near ? "bg-[var(--warning)]" : "bg-[var(--brand-primary-hover)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PlanUsageCard() {
  const { t } = useLocale();
  const [data, setData] = useState<UsagePayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/usage", { credentials: "include" });
        if (res.status === 401) {
          if (!cancelled) setError(t("PlanUsage.errorSignIn", "Sign in to see plan usage."));
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(t("PlanUsage.errorLoad", "Could not load plan usage."));
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(t("Common.errorNetwork", "Network error."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 flex items-center gap-2 text-[var(--text-muted)] border border-[var(--border)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("PlanUsage.loading", "Loading plan…")}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-[var(--text-muted)] border border-[var(--border)]">
        {error || t("PlanUsage.noData", "No plan data.")}{" "}
        <Link href="/login" className="text-[var(--brand-primary)] underline">
          {t("PlanUsage.signInLink", "Sign in")}
        </Link>
      </div>
    );
  }

  const u = data.usage;
  const daysRemaining = data.daysRemaining; // ممکن است undefined یا null یا number باشد

  // ساخت متن روزهای باقی‌مانده با جایگزینی متغیرها (فقط در صورت عدد بودن)
  const daysTemplate = t("PlanUsage.daysRemaining", "{days} day{plural} remaining");
  const daysText =
    typeof daysRemaining === "number" && data.plan !== "free"
      ? interpolate(daysTemplate, {
          days: daysRemaining,
          plural: daysRemaining === 1 ? "" : "s",
        })
      : null;

  // ساخت متن پرداخت‌های در انتظار
  const pendingTemplate = t(
    "PlanUsage.pendingPaymentsLabel",
    "{count} payment{plural} pending admin review."
  );
  const pendingText =
    u.pendingPayments > 0
      ? interpolate(pendingTemplate, {
          count: u.pendingPayments,
          plural: u.pendingPayments > 1 ? "s" : "",
        })
      : null;

  return (
    <div className="glass rounded-2xl p-5 space-y-4 border border-[var(--border)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-[var(--brand-primary)]" />
          <div>
            <p className="text-sm text-[var(--text-muted)]">{t("PlanUsage.currentPlan", "Current plan")}</p>
            <p className="text-lg font-semibold capitalize text-[var(--text-primary)]">
              {data.plan}
              {data.expired ? ` (${t("PlanUsage.expired", "expired")})` : ""}
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="text-xs px-3 py-1.5 rounded-full bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)]"
        >
          {t("PlanUsage.upgrade", "Upgrade")}
        </Link>
      </div>

      {daysText && (
        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
          {typeof daysRemaining === "number" && daysRemaining <= 7 && (
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--warning)]" />
          )}
          {daysText}
        </p>
      )}

      <div className="space-y-3">
        <Bar label={t("PlanUsage.applicationsLabel", "Applications this month")} {...u.applications} />
        <Bar label={t("PlanUsage.savedJobsLabel", "Saved jobs")} {...u.savedJobs} />
        <Bar label={t("PlanUsage.jobAlertsLabel", "Job alerts")} {...u.jobAlerts} />
        <Bar label={t("PlanUsage.aiGenerationsLabel", "AI generations this month")} {...u.aiGenerations} />
        <Bar label={t("PlanUsage.activeEmployerJobsLabel", "Active job posts (employer)")} {...u.activeEmployerJobs} />
      </div>

      {pendingText && <p className="text-xs text-[var(--warning)]">{pendingText}</p>}

      <Link
        href="/pricing"
        className="block text-center text-sm text-[var(--brand-primary)] hover:underline pt-1"
      >
        {t("PlanUsage.viewPricingLink", "View pricing & payment history →")}
      </Link>
    </div>
  );
}
