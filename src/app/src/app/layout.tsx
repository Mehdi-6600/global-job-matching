import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Global Job Matching",
  description: "Find jobs worldwide",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body className={`${GeistSans.className} min-h-screen bg-background text-foreground antialiased`}>
        <SessionProvider session={session}>
          <Navbar />
          <main className="container mx-auto px-4 py-6">{children}</main>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
