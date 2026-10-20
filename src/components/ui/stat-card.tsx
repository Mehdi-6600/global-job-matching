import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * StatCard — headline metric used by the seeker/employer/admin dashboards.
 *
 * Renders as a link when `href` is provided, otherwise as a static panel.
 * Values use tabular numerals so columns line up in every locale.
 */
export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  trend?: "up" | "down" | "flat";
  href?: string;
  accent?: "brand" | "accent" | "warning" | "success" | "neutral";
  className?: string;
}

const accentClass: Record<NonNullable<StatCardProps["accent"]>, string> = {
  brand: "text-[var(--brand-primary)]",
  accent: "text-[var(--brand-accent)]",
  warning: "text-[var(--warning)]",
  success: "text-[var(--success)]",
  neutral: "text-[var(--text-muted)]",
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  href,
  accent = "brand",
  className,
}: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.75rem] font-semibold uppercase tracking-[0.09em] text-[var(--text-muted)]">
          {label}
        </span>
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-2)]",
              accentClass[accent],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="tabular text-[1.75rem] font-[650] leading-none tracking-[-0.03em] text-[var(--text-primary)]">
          {value}
        </span>
        {trend ? (
          <span
            className={cn(
              "mb-0.5 text-[0.6875rem] font-semibold",
              trend === "up"
                ? "text-[var(--success)]"
                : trend === "down"
                  ? "text-[var(--error)]"
                  : "text-[var(--text-subtle)]",
            )}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        ) : null}
      </div>

      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-subtle)]">
          {hint}
        </p>
      ) : null}
    </>
  );

  const classes = cn(
    "block rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 transition-colors duration-200 sm:p-5",
    href && "hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}
