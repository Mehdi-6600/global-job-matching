import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Input — token driven (the previous shadcn classes referenced colour
 * utilities that no longer exist in this Tailwind config, which left inputs
 * unstyled).
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[0.9375rem] text-[var(--text-primary)]",
          "placeholder:text-[var(--text-subtle)]",
          "transition-[border-color,box-shadow,background-color] duration-200",
          "hover:border-[var(--border-strong)]",
          "focus-visible:outline-none focus-visible:border-[var(--brand-primary)] focus-visible:ring-[3px] focus-visible:ring-[var(--brand-primary-soft)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
