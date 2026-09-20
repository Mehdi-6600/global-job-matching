/**
 * Unified Badge — neumorphic pill.
 *
 * Backward-compatible with the previous shadcn API:
 *   <Badge variant="default|secondary|destructive|outline">
 *
 * New variants (also supported):
 *   variant="primary"  — brand cyan tint
 *   variant="success"  — green
 *   variant="warning"  — amber
 *   variant="info"     — soft blue
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-semibold border shadow-[var(--inset-1)] transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-primary-tint)] text-[var(--brand-primary-hover)] border-[var(--brand-primary-soft)]",
        primary:
          "bg-[var(--brand-primary-tint)] text-[var(--brand-primary-hover)] border-[var(--brand-primary-soft)]",
        secondary:
          "bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border-soft)]",
        success:
          "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-soft)]",
        warning:
          "bg-[var(--warning-soft)] text-[#b45309] border-[var(--warning-soft)]",
        info:
          "bg-[var(--info-soft)] text-[var(--info)] border-[var(--info-soft)]",
        destructive:
          "bg-[var(--error-soft)] text-[var(--error)] border-[var(--error-soft)]",
        outline:
          "bg-transparent text-[var(--text-primary)] border-[var(--border)] shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
