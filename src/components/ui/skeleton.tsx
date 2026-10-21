/**
 * Skeleton loaders — shimmer lines that match the neumorphic surface.
 *
 * Usage:
 *   <SkeletonLine width="70%" />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

const baseClass =
  "rounded-[var(--radius-xs)] bg-[linear-gradient(90deg,var(--surface-3)_0%,var(--surface-2)_50%,var(--surface-3)_100%)] bg-[length:200%_100%] animate-[gjm-shimmer_1.5s_ease-in-out_infinite]";

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
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
        />
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
        "gjm-raised rounded-[var(--radius-2xl)] p-5 sm:p-6",
        "flex flex-col gap-3",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <SkeletonLine width={48} height={48} className="!rounded-[var(--radius-md)]" />
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonLine width="70%" height={16} />
          <SkeletonLine width="40%" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <SkeletonLine width="100%" height={36} className="!rounded-[var(--radius-md)]" />
    </div>
  );
}
