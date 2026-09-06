import type { Metadata, Viewport } from "next";
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

const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://global-job-matching.vercel.app"
).replace(/\/$/, "");

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8eef5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Global Job Matching — Find jobs worldwide",
    template: "%s | Global Job Matching",
  },
  description:
    "Global Job Matching helps job seekers and employers connect worldwide. Browse jobs, apply, and hire with a modern secure job board.",
  keywords: [
    "jobs",
    "global jobs",
    "remote jobs",
    "job matching",
    "hire talent",
    "career",
    "employment",
  ],
  authors: [{ name: "Global Job Matching" }],
  creator: "Global Job Matching",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Global Job Matching",
    title: "Global Job Matching — Find jobs worldwide",
    description:
      "Browse global jobs, apply in one place, and hire talent with a secure modern platform.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Global Job Matching",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Job Matching",
    description: "Find jobs and hire talent worldwide on Global Job Matching.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical: siteUrl },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GJM Jobs",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Global Job Matching",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
