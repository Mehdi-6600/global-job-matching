/**
 * PageHeader — consistent page title block.
 *
 * Renders a kicker, title, optional description, and optional actions.
 * RTL-aware: actions stack naturally using flex + logical properties.
 *
 * Example:
 *   <PageHeader
 *     kicker={t("Jobs.kicker", "GLOBAL CAREERS")}
 *     title={t("Jobs.title", "Find Your Dream Job")}
 *     description={t("Jobs.subtitle", "Search among thousands...")}
 *     actions={<Button>{t("Common.submit", "Search")}</Button>}
 *   />
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
        "flex flex-col gap-3 sm:gap-4",
        align === "center" ? "items-center text-center" : "items-start",
        "mb-6 sm:mb-8",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 w-full",
          align === "center" ? "items-center" : "items-start",
          actions ? "sm:flex-row sm:items-end sm:justify-between" : "",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-2 max-w-2xl",
            align === "center" ? "items-center" : "items-start",
          )}
        >
          {kicker ? (
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary-hover)]">
              {kicker}
            </span>
          ) : null}
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
