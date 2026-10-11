"use client";

/**
 * DynamicButton — a stateful action button for primary and secondary actions.
 *
 * States (controlled by the caller via `status`):
 *   idle     → icon + label
 *   loading  → spinner + `loadingLabel`. Uses aria-disabled (not disabled) so
 *              focus is not lost mid-request, and clicks are swallowed.
 *   success  → check icon + `successLabel`
 *   error    → alert icon + `errorLabel` (still clickable, so users can retry)
 *
 * Motion (CSS only, see `.gjm-dynamic-btn` in globals.css):
 *   - Press: scale(0.97), transform only.
 *   - Width: animates to the measured width of the active label, so the
 *     button morphs smoothly instead of jumping.
 *   - Content: short opacity + blur crossfade when the state changes.
 *   - Reduced motion: no movement, width snaps, fades stay.
 *
 * Announcements: a visually hidden live region reports loading, success,
 * and error labels to screen readers.
 */

import * as React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DynamicButtonVariant = "primary" | "secondary";
export type DynamicButtonStatus = "idle" | "loading" | "success" | "error";
export type DynamicButtonSize = "sm" | "md" | "lg";

export interface DynamicButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: React.ReactNode;
  variant?: DynamicButtonVariant;
  size?: DynamicButtonSize;
  status?: DynamicButtonStatus;
  /** Icon shown in the idle state, before the label. */
  icon?: React.ReactNode;
  /** Label while loading. Defaults to `children`. */
  loadingLabel?: string;
  /** Label on success. Defaults to `children`. */
  successLabel?: string;
  /** Label on error. Defaults to `children`. */
  errorLabel?: string;
  /**
   * Set false when a nearby live region already announces the same change,
   * to avoid announcing it twice.
   */
  announce?: boolean;
  /** Mirror directional icons (send, arrows) when the page is RTL. */
  mirrorIconInRtl?: boolean;
  /** Fill the container width. The width morph is skipped in this mode. */
  fullWidth?: boolean;
}

// useLayoutEffect warns during SSR in some React versions; fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function setRef<T>(ref: React.ForwardedRef<T>, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

const DynamicButton = React.forwardRef<HTMLButtonElement, DynamicButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      status = "idle",
      icon,
      loadingLabel,
      successLabel,
      errorLabel,
      announce = true,
      mirrorIconInRtl = false,
      fullWidth = false,
      disabled = false,
      type = "button",
      className,
      style,
      onClick,
      ...rest
    },
    forwardedRef,
  ) => {
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const contentRef = React.useRef<HTMLSpanElement | null>(null);
    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        setRef(forwardedRef, node);
      },
      [forwardedRef],
    );
    const [measuredWidth, setMeasuredWidth] = React.useState<
      number | undefined
    >(undefined);

    const isLoading = status === "loading";
    const isSuccess = status === "success";
    const isError = status === "error";
    const inert = disabled || isLoading;

    // Measure the active content and let CSS animate the button's width to it.
    // The content is nowrap and shrink-proof, so its width is its natural width.
    useIsomorphicLayoutEffect(() => {
      if (fullWidth) return;
      const button = buttonRef.current;
      const content = contentRef.current;
      if (!button || !content) return;

      const measure = () => {
        const cs = window.getComputedStyle(button);
        const chrome =
          parseFloat(cs.paddingLeft) +
          parseFloat(cs.paddingRight) +
          parseFloat(cs.borderLeftWidth) +
          parseFloat(cs.borderRightWidth);
        const contentWidth = content.getBoundingClientRect().width;
        // A zero width means the button is not rendered (for example inside a
        // hidden panel). Keep the natural width instead of collapsing to 0.
        const next = contentWidth > 0 ? Math.ceil(contentWidth + chrome) : undefined;
        setMeasuredWidth((prev) => (prev === next ? prev : next));
      };

      measure();
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(measure);
      observer.observe(content);
      return () => observer.disconnect();
    }, [fullWidth, status]);

    const label = isLoading
      ? (loadingLabel ?? children)
      : isSuccess
        ? (successLabel ?? children)
        : isError
          ? (errorLabel ?? children)
          : children;

    const leading = isLoading ? (
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
    ) : isSuccess ? (
      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
    ) : isError ? (
      <AlertCircle aria-hidden="true" className="h-4 w-4" />
    ) : icon ? (
      <span
        aria-hidden="true"
        data-mirror={mirrorIconInRtl ? "true" : undefined}
        className="gjm-dynamic-btn__icon"
      >
        {icon}
      </span>
    ) : null;

    // Announce only the state labels. Idle announces nothing.
    const announcement =
      status !== "idle" && announce && typeof label === "string"
        ? label
        : "";

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (inert) {
        // Also cancels implicit form submission (Enter) while loading.
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <>
        <button
          ref={mergedRef}
          type={type}
          disabled={disabled}
          aria-disabled={isLoading || undefined}
          aria-busy={isLoading || undefined}
          data-variant={variant}
          data-size={size}
          data-status={status}
          onClick={handleClick}
          style={
            fullWidth || measuredWidth === undefined
              ? style
              : { width: measuredWidth, ...style }
          }
          className={cn(
            "gjm-dynamic-btn",
            fullWidth && "w-full",
            className,
          )}
          {...rest}
        >
          <span ref={contentRef} key={status} className="gjm-dynamic-btn__content">
            {leading}
            <span>{label}</span>
          </span>
        </button>
        <span
          role="status"
          aria-live={isError ? "assertive" : "polite"}
          className="sr-only"
        >
          {announcement}
        </span>
      </>
    );
  },
);

DynamicButton.displayName = "DynamicButton";

export { DynamicButton };
