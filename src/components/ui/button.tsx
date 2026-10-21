/**
 * Unified Button — neumorphic design system.
 *
 * Backward-compatible with the previous shadcn-style API:
 *   <Button variant="default|destructive|outline|secondary|ghost|link"
 *           size="default|sm|lg|icon"
 *           asChild>
 *
 * Under the hood it uses the gjm-* neumorphic classes so the visual
 * language matches HomePage and the rest of the soft neumorphic system.
 *
 * New variants (also supported):
 *   variant="white"   — for use on dark backgrounds (final CTA, employer)
 *   variant="primary" — alias for "default"
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "gjm-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-primary)] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default: "gjm-btn-primary",
        primary: "gjm-btn-primary",
        secondary: "gjm-btn-secondary",
        white: "gjm-btn-white",
        destructive:
          "bg-[var(--error)] text-white shadow-[var(--elev-2)] hover:brightness-110 active:shadow-[var(--inset-2)]",
        outline:
          "bg-transparent border border-[var(--border)] text-[var(--text-primary)] shadow-none hover:bg-[var(--surface)] hover:shadow-[var(--elev-1)]",
        ghost:
          "bg-transparent text-[var(--text-body)] shadow-none hover:bg-[var(--surface)] hover:shadow-[var(--elev-1)]",
        link:
          "bg-transparent text-[var(--brand-primary-hover)] shadow-none underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-8 px-3 text-xs rounded-[var(--radius-sm)]",
        lg: "h-12 px-8 text-base rounded-[var(--radius-xl)]",
        icon: "h-10 w-10 p-0 rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
