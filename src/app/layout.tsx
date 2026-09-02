import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://global-job-matching.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Global Job Matching — Find jobs worldwide",
    template: "%s | Global Job Matching",
  },
  description:
    "Global Job Matching helps job seekers and employers connect worldwide. Browse jobs, apply, and hire with a modern secure job board.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Global Job Matching",
    title: "Global Job Matching — Find jobs worldwide",
    description:
      "Browse global jobs, apply in one place, and hire talent with a secure modern platform.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Job Matching",
    description: "Find jobs and hire talent worldwide on Global Job Matching.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body
        className={`${inter.className} antialiased min-h-screen flex flex-col bg-[#e8eef5] text-slate-800`}
      >
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
