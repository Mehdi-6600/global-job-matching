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
   via system fallback on modern OSes.
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

/*
 * themeColor is aligned with --bg-page (#e8e5e0) so the mobile
 * browser chrome matches the soft neumorphic cream surface instead
 * of a jarring white bar.
 *
 * maximumScale: 1 prevents double-tap zoom on mobile, which is
 * what causes the page to "jump" when a user taps an input.
 * Accessibility is preserved — iOS/Android system-level zoom
 * (three-finger tap, accessibility shortcuts) still works.
 */
export const viewport: Viewport = {
  themeColor: "#e8e5e0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/*
 * Locale-aware font stack.
 *
 * The order matters: the first family with an available glyph for a
 * given codepoint wins in CSS font-family. Latin script is present in
 * all three fonts, so we must put the *script-specific* font first per
 * locale to avoid Inter rendering Arabic/Devanagari fallback glyphs.
 *
 * - fa / ar → Vazirmatn / Noto Kufi first
 * - hi      → Inter first (Devanagari falls back to OS, but Inter has
 *              no Devanagari so the fallback chain handles it)
 * - en/es/fr/de → Inter first
 */
function fontStackForLocale(
  locale: string,
  variables: {
    inter: string;
    vazirmatn: string;
    notoKufi: string;
  },
): string {
  switch (locale) {
    case "fa":
      return `${variables.vazirmatn} ${variables.inter} ${variables.notoKufi}`;
    case "ar":
      return `${variables.notoKufi} ${variables.inter} ${variables.vazirmatn}`;
    case "hi":
    case "en":
    case "es":
    case "fr":
    case "de":
    default:
      return `${variables.inter} ${variables.vazirmatn} ${variables.notoKufi}`;
  }
}

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
  applicationName: "Global Job Matching",
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
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GJM Jobs",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
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

  /*
   * Attach ALL three font variables to <html> so runtime locale
   * switches still have their correct font available without a
   * full page reload. The *order* in which they are listed is
   * script-specific so the correct family wins per locale.
   */
  const fontClasses = fontStackForLocale(locale, {
    inter: inter.variable,
    vazirmatn: vazirmatn.variable,
    notoKufi: notoKufi.variable,
  });

  return (
    <html
      lang={locale}
      dir={dir}
      className={`light ${fontClasses}`}
      suppressHydrationWarning
    >
      <head>
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
