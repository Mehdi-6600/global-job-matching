import type { Metadata, Viewport } from "next";
import { Inter, Vazirmatn, Noto_Kufi_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Providers } from "./providers";
import {
  websiteJsonLd,
  organizationSiteJsonLd,
} from "@/lib/seo/json-ld";
import { jsonLdScript } from "@/lib/seo/core";
import { LOCALE_COOKIE, isRtlLocale } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

/* ----------------------------------------------------------------
   Fonts — one per script family
   - Inter        : Latin  (en, es, fr, de)
   - Vazirmatn    : Arabic script for Persian (fa)
   - Noto Kufi    : Arabic script for Arabic (ar)
   Hindi falls back to Inter, which renders Devanagari correctly
   via system fallback on modern OSes. If you want full Devanagari
   coverage, we can add Noto_Sans_Devanagari later.
   ---------------------------------------------------------------- */

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  variable: "--font-inter",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-vazirmatn",
  fallback: ["Tahoma", "system-ui", "sans-serif"],
});

const notoKufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-noto-kufi",
  fallback: ["Tahoma", "system-ui", "sans-serif"],
});

const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://global-job-matching.vercel.app"
).replace(/\/$/, "");

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Global Job Matching — Find jobs worldwide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Job Matching",
    description: "Find jobs and hire talent worldwide on Global Job Matching.",
    images: ["/twitter-image"],
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
  alternates: {
    canonical: siteUrl,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GJM Jobs",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  const websiteLd = websiteJsonLd();
  const orgLd = organizationSiteJsonLd();

  /* Build the font-class string. All three fonts are always
     attached so that any locale change at runtime immediately
     has its correct font available. */
  const fontClasses = `${inter.variable} ${vazirmatn.variable} ${notoKufi.variable}`;

  return (
    <html
      lang={locale}
      dir={dir}
      className={`light ${fontClasses}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="dns-prefetch"
          href="https://fonts.gstatic.com"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(websiteLd),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(orgLd),
          }}
        />
      </head>

      <body
        className="antialiased min-h-screen flex flex-col"
        style={{
          background: "var(--bg-page)",
          color: "var(--text-body)",
        }}
      >
        <Providers>
          <Navbar />

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}
