/**
 * ProcessingStatus — a status panel for long-running work (AI generation,
 * analysis, submission) and its completion.
 *
 * Adapted from the receipt-printer reference: the completed result feeds in
 * top-down (see `.gjm-feed-in`), and the panel settles into place. It is not
 * a literal printer.
 *
 * Accessibility: when `announce` is true (default) the root is a live region
 * that stays mounted, so changes are announced reliably. It is visually hidden
 * while idle.
 *
 * Pass only real states. This component does not invent progress percentages
 * or steps that the backend does not report.
 *
 * Presentational only, so no "use client" is needed.
 */

import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProcessingState = "idle" | "processing" | "success" | "error";

export interface ProcessingStatusProps {
  state: ProcessingState;
  /** Short status text, already translated. */
  title?: string;
  /** Optional supporting line, already translated. */
  description?: string;
  /**
   * Set false when a nearby control already announces this change
   * (for example the button that started the work).
   */
  announce?: boolean;
  className?: string;
}

export function ProcessingStatus({
  state,
  title,
  description,
  announce = true,
  className,
}: ProcessingStatusProps) {
  const hidden = state === "idle" || !title;

  return (
    <div
      role={announce ? "status" : undefined}
      aria-live={
        announce ? (state === "error" ? "assertive" : "polite") : undefined
      }
      aria-busy={state === "processing" || undefined}
      data-state={state}
      className={cn(hidden ? "sr-only" : "gjm-processing", className)}
    >
      {!hidden && (
        <>
          <span className="gjm-processing__icon" aria-hidden="true">
            {state === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : state === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <span className="gjm-processing__pulse" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="gjm-processing__title">{title}</p>
            {description && (
              <p className="gjm-processing__desc">{description}</p>
            )}
            {state === "processing" && (
              <div className="gjm-processing__track" aria-hidden="true">
                <span className="gjm-processing__bar" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
