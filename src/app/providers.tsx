"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { LocaleProvider } from "@/components/locale-provider";
import { SessionGuard } from "@/components/session-guard";

const AnalyticsTracker = dynamic(
  () =>
    import("@/components/analytics-tracker").then((m) => m.AnalyticsTracker),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Fewer session refetches = less network on navigation
      refetchInterval={5 * 60}
      refetchOnWindowFocus={false}
    >
      <SessionGuard />

      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <LocaleProvider>
          <AnalyticsTracker />
          {children}
        </LocaleProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
