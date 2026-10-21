/**
 * Unified Card — neumorphic design system.
 *
 * Variants:
 *   raised (default) — soft neumorphic elevation, used for content blocks
 *   flat             — no shadow, subtle border, used for lists inside cards
 *   inset            — inset neumorphic, used for inputs/inner panels
 *
 * Composition helpers:
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
  raised: "gjm-raised border border-[var(--border-soft)]",
  flat: "bg-[var(--surface)] border border-[var(--border-soft)]",
  inset: "gjm-inset border border-[var(--border)]",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "raised", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-2xl)]",
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
    className={cn("flex flex-col gap-1 p-5 sm:p-6", className)}
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
      "text-xs font-bold uppercase tracking-wider text-[var(--brand-primary-hover)]",
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
      "text-lg font-bold text-[var(--text-primary)] leading-tight",
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
      "text-sm text-[var(--text-muted)] leading-relaxed",
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
  <div ref={ref} className={cn("px-5 sm:px-6 pb-5 sm:pb-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-3 px-5 sm:px-6 py-4 border-t border-[var(--border-soft)]",
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
