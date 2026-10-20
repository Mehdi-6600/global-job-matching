"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

/**
 * Canonical theme toggle (light / dark).
 *
 * next-themes resolves `system` on the client, so the first paint renders an
 * inert placeholder to avoid a hydration mismatch.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const label = t("Common.toggleTheme", "Toggle theme");

  if (!mounted) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] ${className}`}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-transparent text-[var(--text-muted)] transition-colors duration-200 hover:border-[var(--border-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] ${className}`}
    >
      {isDark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}

export default ThemeToggle;
