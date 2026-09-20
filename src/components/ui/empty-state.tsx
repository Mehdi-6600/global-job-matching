/**
 * EmptyState — consistent empty state block.
 *
 * Always includes icon + title + optional description + optional CTA.
 * RTL-aware.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-3",
        "px-6 py-12 sm:py-16",
        "gjm-inset rounded-[var(--radius-2xl)]",
        "border border-dashed border-[var(--border)]",
        className,
      )}
    >
      {icon ? (
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--surface)] text-[var(--brand-primary)] shadow-[var(--elev-2)]">
          {icon}
        </span>
      ) : null}

      <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      {description ? (
        <p className="text-sm text-[var(--text-muted)] max-w-md leading-relaxed">
          {description}
        </p>
      ) : null}

      {action ? (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}
