import { useCallback, useEffect, useState } from "react";

/**
 * Holds a short-lived UI status (for example "success" for ~2.4s) and resets
 * it to null. Timers are cleared on unmount and restarted on every change.
 */
export function useTransientFeedback<T>(durationMs = 2400) {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    if (value === null) return;
    const id = window.setTimeout(() => setValue(null), durationMs);
    return () => window.clearTimeout(id);
  }, [value, durationMs]);

  const flash = useCallback((next: T) => setValue(next), []);

  return [value, flash] as const;
}
