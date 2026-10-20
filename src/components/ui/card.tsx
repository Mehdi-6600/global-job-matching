/**
 * Card — Ink & Signal design system.
 *
 * Variants:
 *   raised (default) — white panel, hairline border, ambient shadow
 *   flat             — panel without shadow, for dense lists
 *   inset            — recessed well on the page surface
 *
 * Composition helpers keep the same exported names:
 *   <Card>
 *     <CardHeader>
 *       <CardKicker>...</CardKicker>
 *       <CardTitle>...</CardTitle>
 *       <CardDescription>...</CardDescription>
 *     </CardHeader>
 *     <CardContent>...</CardContent>
 *     <CardFooter>...</CardFooter>
 *   </Card>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type CardVariant = "raised" | "flat" | "inset";

const variantClass: Record<CardVariant, string> = {
  raised:
    "bg-[var(--surface)] border border-[var(--border-soft)] shadow-[var(--shadow-1)]",
  flat: "bg-[var(--surface)] border border-[var(--border-soft)]",
  inset: "bg-[var(--surface-2)] border border-[var(--border-soft)]",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "raised", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-xl)] transition-colors duration-200",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 p-5 sm:p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardKicker = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "text-[0.6875rem] font-bold uppercase tracking-[0.13em] text-[var(--brand-primary-hover)]",
      className,
    )}
    {...props}
  />
));
CardKicker.displayName = "CardKicker";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-tight tracking-[-0.02em] text-[var(--text-primary)]",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm leading-relaxed text-[var(--text-muted)]",
      className,
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-3 border-t border-[var(--border-soft)] px-5 py-4 sm:px-6",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardKicker,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
