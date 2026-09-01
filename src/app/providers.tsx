"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { NotificationProvider } from "@/components/notification-provider";
import { LocaleProvider } from "@/components/locale-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <LocaleProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
