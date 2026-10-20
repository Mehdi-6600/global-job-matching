import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { cookies } from "next/headers";
import "./globals.css";
import "./design-system.css";
import "./home.css";
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
   Fonts — one self-hosted variable file per script family.

   These are the same typefaces as before (Inter, Vazirmatn, Noto Kufi
   Arabic) but served from /src/fonts via next/font/local instead of being
   fetched from Google Fonts at build time. That makes `next build`
   deterministic and keeps the CSP `font-src 'self'` rule honest.
   The OFL licence for each family sits next to the file.

   - Inter                 : Latin (en, es, fr, de, pt, tr, id)
   - Vazirmatn             : Arabic script for Persian (fa)
   - Noto Kufi Arabic      : Arabic script for Arabic (ar)
   - Noto Sans Devanagari  : Devanagari for Hindi (hi)
   ---------------------------------------------------------------- */

const inter = localFont({
  src: "../fonts/Inter-Variable-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: true,
  variable: "--font-inter",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

const vazirmatn = localFont({
  src: "../fonts/Vazirmatn-Variable-arabic.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-vazirmatn",
  fallback: ["Tahoma", "system-ui", "sans-serif"],
});

const notoKufi = localFont({
  src: "../fonts/NotoKufiArabic-Variable-arabic.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-noto-kufi",
  fallback: ["Tahoma", "system-ui", "sans-serif"],
});

const notoDevanagari = localFont({
  src: "../fonts/NotoSansDevanagari-Variable-devanagari.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-noto-devanagari",
  fallback: ["Nirmala UI", "system-ui", "sans-serif"],
});

const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://global-job-matching.vercel.app"
).replace(/\/$/, "");

/**
 * Google Search Console — URL-prefix verification.
 * Paste the `content` value from the HTML tag method, or set
 * NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Vercel env.
 * Example meta: <meta name="google-site-verification" content="...." />
 */
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
  "YOUR_CODE_HERE";

/* The browser chrome follows the shared mist canvas. Keep native pinch
 * zoom available; all text fields also use a 16px minimum on small screens
 * to avoid iOS focus-zoom without disabling user scaling. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#080d0b" },
  ],
  width: "device-width",
  initialScale: 1,
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
    geist: string;
    inter: string;
    vazirmatn: string;
    notoKufi: string;
    notoDevanagari: string;
  },
): string {
  switch (locale) {
    case "fa":
      return `${variables.vazirmatn} ${variables.geist} ${variables.inter} ${variables.notoKufi}`;
    case "ar":
      return `${variables.notoKufi} ${variables.geist} ${variables.inter} ${variables.vazirmatn}`;
    case "hi":
      return `${variables.notoDevanagari} ${variables.geist} ${variables.inter} ${variables.vazirmatn}`;
    case "en":
    case "es":
    case "fr":
    case "de":
    case "pt":
    case "tr":
    case "zh":
    case "ja":
    case "id":
    default:
      return `${variables.geist} ${variables.inter} ${variables.notoDevanagari} ${variables.vazirmatn} ${variables.notoKufi}`;
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
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
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
    geist: GeistSans.variable,
    notoDevanagari: notoDevanagari.variable,
    inter: inter.variable,
    vazirmatn: vazirmatn.variable,
    notoKufi: notoKufi.variable,
  });

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fontClasses}`}
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
        <Providers initialLocale={locale}>
          <Navbar />

          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}
