/**
 * Button — Ink & Signal design system.
 *
 * Backward-compatible with the existing API:
 *   <Button variant="default|primary|secondary|outline|ghost|link|white|destructive"
 *           size="default|sm|lg|icon"
 *           asChild>
 *
 * All colours come from semantic tokens, so light and dark themes are handled
 * automatically and RTL needs no special casing.
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-normal text-center",
    "font-semibold tracking-[-0.005em] select-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]",
    "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-action)] text-[var(--text-muted)] border border-transparent shadow-sm hover:bg-[var(--brand-action-hover)]",
        primary:
          "bg-[var(--brand-action)] text-[var(--text-muted)] border border-transparent shadow-sm hover:bg-[var(--brand-action-hover)]",
        secondary:
          "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] shadow-sm hover:bg-[var(--surface-2)]",
        white:
          "bg-[var(--surface)] text-[var(--brand-primary-hover)] border border-[var(--border-soft)] shadow-sm hover:bg-[var(--surface-2)]",
        destructive:
          "bg-[var(--error)] text-[var(--text-on-brand)] border border-transparent hover:brightness-110",
        outline:
          "bg-transparent text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--surface-2)]",
        ghost:
          "bg-transparent text-[var(--text-body)] border border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
        link: "bg-transparent text-[var(--brand-primary-hover)] underline-offset-4 hover:underline p-0 h-auto min-h-0 border-transparent",
      },
      size: {
        default: "h-11 px-5 text-[0.9375rem] rounded-[var(--radius-md)]",
        sm: "h-9 px-3.5 text-[0.8125rem] rounded-[var(--radius-sm)]",
        lg: "h-12 px-6 text-base rounded-[var(--radius-lg)]",
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
