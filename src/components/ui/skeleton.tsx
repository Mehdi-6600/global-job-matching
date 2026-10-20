/**
 * Skeleton loaders — matching the Ink & Signal surfaces.
 *
 * Usage:
 *   <SkeletonLine width="70%" />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 *   <SkeletonJobCard />  (job listing placeholder)
 */

import * as React from "react";
import { cn } from "@/lib/utils";

const baseClass =
  "rounded-[var(--radius-xs)] bg-[linear-gradient(90deg,var(--surface-2)_0%,var(--surface-3)_45%,var(--surface-2)_90%)] bg-[length:220%_100%] animate-[gjm-shimmer_1.6s_ease-in-out_infinite]";

export interface SkeletonLineProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export function SkeletonLine({
  width = "100%",
  height = 12,
  className,
  style,
  ...props
}: SkeletonLineProps) {
  return (
    <div
      className={cn(baseClass, className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

export interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <SkeletonLine
          width={48}
          height={48}
          className="!rounded-[var(--radius-md)]"
        />
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonLine width="70%" height={16} />
          <SkeletonLine width="40%" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-4">
        <SkeletonLine width="30%" height={14} />
        <SkeletonLine
          width={84}
          height={30}
          className="!rounded-[var(--radius-pill)]"
        />
      </div>
    </div>
  );
}

export function SkeletonJobCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <SkeletonLine
          width={44}
          height={44}
          className="!rounded-[var(--radius-md)]"
        />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="65%" height={15} />
          <SkeletonLine width="35%" height={11} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <SkeletonLine width={72} height={22} className="!rounded-full" />
        <SkeletonLine width={58} height={22} className="!rounded-full" />
        <SkeletonLine width={90} height={22} className="!rounded-full" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
        <SkeletonLine width="28%" height={14} />
        <SkeletonLine width={60} height={12} />
      </div>
    </div>
  );
}
