/**
 * Badge — Ink & Signal.
 *
 * Backward-compatible variants: default | primary | secondary | success |
 * warning | info | destructive | outline | accent.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold leading-none tracking-[0.01em] whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-primary-tint)] text-[var(--brand-primary-hover)] border-[var(--brand-primary-soft)]",
        primary:
          "bg-[var(--brand-primary-tint)] text-[var(--brand-primary-hover)] border-[var(--brand-primary-soft)]",
        accent:
          "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] border-[var(--brand-accent-soft)]",
        secondary:
          "bg-[var(--surface-2)] text-[var(--text-body)] border-[var(--border-soft)]",
        success:
          "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-soft)]",
        warning:
          "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-soft)]",
        info: "bg-[var(--info-soft)] text-[var(--info)] border-[var(--info-soft)]",
        destructive:
          "bg-[var(--error-soft)] text-[var(--error)] border-[var(--error-soft)]",
        outline:
          "bg-transparent text-[var(--text-body)] border-[var(--border)]",
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
