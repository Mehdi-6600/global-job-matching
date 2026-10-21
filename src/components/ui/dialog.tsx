"use client";

/**
 * Dialog — accessible, neumorphic, RTL-aware.
 *
 * Features:
 *   - Escape key closes
 *   - Backdrop click closes
 *   - Focus is moved into the dialog on open
 *   - Restores focus on close
 *   - Locks body scroll while open
 *   - Uses `dir` inherited from <html> so RTL works
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <Dialog open={open} onClose={() => setOpen(false)} title="...">
 *     <p>...</p>
 *   </Dialog>
 */

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Max width class for the panel. Defaults to max-w-md. */
  maxWidthClass?: string;
  /** Hide the top-right close button. */
  hideCloseButton?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClass = "max-w-md",
  hideCloseButton = false,
  className,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  // Escape key handler
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Focus + scroll lock
  React.useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    // Focus the panel after paint
    const t = setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-[rgba(42,39,36,0.55)]",
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative w-full",
          maxWidthClass,
          "gjm-raised rounded-[var(--radius-2xl)]",
          "border border-[var(--border-soft)]",
          "p-5 sm:p-6",
          "outline-none",
          "max-h-[90vh] overflow-y-auto",
          className,
        )}
      >
        {!hideCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 end-4 inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}

        {(title || description) && (
          <header className="mb-4 pe-8">
            {title ? (
              <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {description}
              </p>
            ) : null}
          </header>
        )}

        <div className="text-sm text-[var(--text-body)]">{children}</div>

        {footer ? (
          <footer className="mt-5 pt-4 border-t border-[var(--border-soft)] flex flex-wrap items-center justify-end gap-2">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
