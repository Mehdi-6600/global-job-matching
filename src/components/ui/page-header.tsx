/**
 * PageHeader — consistent page title block.
 *
 * Renders a kicker, title, optional description, and optional actions.
 * RTL-aware: uses flex + logical spacing only.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  align?: "start" | "center";
  className?: string;
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  align = "start",
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-7 flex flex-col gap-4 sm:mb-9",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col gap-4",
          align === "center"
            ? "items-center"
            : actions
              ? "sm:flex-row sm:items-end sm:justify-between"
              : "",
        )}
      >
        <div
          className={cn(
            "flex max-w-2xl flex-col gap-2.5",
            align === "center" ? "items-center" : "items-start",
          )}
        >
          {kicker ? (
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--brand-primary-hover)]">
              {kicker}
            </span>
          ) : null}
          <h1 className="text-[clamp(1.6rem,2.4vw+0.9rem,2.35rem)] font-[640] leading-[1.12] tracking-[-0.03em] text-[var(--text-primary)]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-[0.9375rem]">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
