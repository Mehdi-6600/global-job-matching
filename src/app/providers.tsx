"use client";

import { ThemeProvider } from "next-themes";
import { NotificationProvider } from "@/components/notification-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <NotificationProvider>{children}</NotificationProvider>
    </ThemeProvider>
  );
}
