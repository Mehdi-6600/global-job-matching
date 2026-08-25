import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: {
    default: "Global Job Matching | Find Your Dream Job",
    template: "%s | Global Job Matching",
  },
  description:
    "Connect with top employers worldwide. Find remote and on-site jobs in technology, design, marketing, finance, healthcare, and more.",
  keywords: [
    "jobs",
    "hiring",
    "remote work",
    "tech jobs",
    "career",
    "job board",
    "global jobs",
    "freelance",
    "full-time",
  ],
  authors: [{ name: "Global Job Matching" }],
  creator: "Global Job Matching",
  metadataBase: new URL("https://global-job-matching.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Global Job Matching",
    title: "Global Job Matching | Find Your Dream Job",
    description:
      "Connect with top employers worldwide. Find remote and on-site jobs in technology, design, marketing, finance, healthcare, and more.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Global Job Matching - Find Your Dream Job",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Job Matching | Find Your Dream Job",
    description:
      "Connect with top employers worldwide. Find remote and on-site jobs in technology, design, marketing, finance, healthcare, and more.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "GlobalJob",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-slate-900 text-white antialiased overflow-x-hidden min-h-dvh">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
