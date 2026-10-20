"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { LocaleProvider } from "@/components/locale-provider";
import { SessionGuard } from "@/components/session-guard";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import type { Locale } from "@/lib/i18n/config";

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <SessionProvider
      // Fewer session refetches = less network on navigation
      refetchInterval={5 * 60}
      refetchOnWindowFocus={false}
    >
      <SessionGuard />

      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="gjm-theme"
      >
        <LocaleProvider initialLocale={initialLocale}>
          <AnalyticsTracker />
          {children}
        </LocaleProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
