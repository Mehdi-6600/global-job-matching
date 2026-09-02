"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Lightweight page-view tracker.
 * Mount once in the root layout (inside Providers).
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // Skip noisy private/admin paths if you prefer
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/bootstrap-owner")
    ) {
      return;
    }

    const payload = {
      path: pathname,
      referrer:
        typeof document !== "undefined" ? document.referrer || null : null,
    };

    // fire-and-forget
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // ignore network errors
    });
  }, [pathname]);

  return null;
}
