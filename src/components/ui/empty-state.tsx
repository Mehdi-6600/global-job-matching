/**
 * EmptyState — consistent empty state block.
 *
 * Always includes icon + title + optional description + optional CTA.
 * RTL-aware (logical spacing only).
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
        "flex flex-col items-center gap-3 rounded-[var(--radius-2xl)] border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-6 py-14 text-center sm:py-16",
        className,
      )}
    >
      {icon ? (
        <span className="mb-1 inline-flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--brand-primary)]">
          {icon}
        </span>
      ) : null}

      <h3 className="text-base font-semibold text-[var(--text-primary)] sm:text-lg">
        {title}
      </h3>

      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
      ) : null}

      {action ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}
