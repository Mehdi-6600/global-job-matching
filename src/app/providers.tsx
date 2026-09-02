"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { NotificationProvider } from "@/components/notification-provider";
import { LocaleProvider } from "@/components/locale-provider";

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
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <LocaleProvider>
          <NotificationProvider>
            <AnalyticsTracker />
            {children}
          </NotificationProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
