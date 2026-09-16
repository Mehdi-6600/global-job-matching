// @ts-check
/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// ثابت‌ها
// ---------------------------------------------------------------------------

/** یک هفته بر حسب ثانیه */
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

/** دو سال بر حسب ثانیه (برای HSTS) */
const TWO_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 2;

/** هاست‌های مجاز برای تصاویر ریموت */
const REMOTE_IMAGE_PATTERNS = [
  { protocol: "https", hostname: "lh3.googleusercontent.com" },
  { protocol: "https", hostname: "avatars.githubusercontent.com" },
  { protocol: "https", hostname: "public.blob.vercel-storage.com" },
  { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "remoteok.com" },
  { protocol: "https", hostname: "www.arbeitnow.com" },
];

/**
 * سیاست امنیتی محتوا (CSP) در حالت Enforcing.
 *
 * نکته: تا زمانی که اسکریپت‌ها بر پایهٔ nonce سیم‌کشی نشوند،
 * استفاده از 'unsafe-inline' و 'unsafe-eval' در script-src اجتناب‌ناپذیر است.
 * موارد framing، plugins و base-uri از همان ابتدا fail-closed هستند.
 */
const CSP_ENFORCE = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "worker-src 'self' blob:",
  "child-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// ---------------------------------------------------------------------------
// پیکربندی Next.js
// ---------------------------------------------------------------------------

/** @type {import('next').NextConfig} */
const nextConfig = {
  // -------------------------------------------------------------------------
  // Experimental
  // -------------------------------------------------------------------------
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // -------------------------------------------------------------------------
  // Linting & Type Checking
  // -------------------------------------------------------------------------
  eslint: {
    // تا زمان پاک‌سازی کامل lint در CI در کل ریپو، خطاها build را متوقف نکنند.
    ignoreDuringBuilds: true,
  },

  typescript: {
    // خطاهای تایپ باید build را متوقف کنند.
    ignoreBuildErrors: false,
  },

  // -------------------------------------------------------------------------
  // Images
  // -------------------------------------------------------------------------
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: REMOTE_IMAGE_PATTERNS,
    minimumCacheTTL: ONE_WEEK_IN_SECONDS,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // -------------------------------------------------------------------------
  // General
  // -------------------------------------------------------------------------
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // -------------------------------------------------------------------------
  // HTTP Headers
  // -------------------------------------------------------------------------
  async headers() {
    return [
      // هدرهای امنیتی سراسری
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: `max-age=${TWO_YEARS_IN_SECONDS}; includeSubDomains; preload`,
          },
          {
            key: "Content-Security-Policy",
            value: CSP_ENFORCE,
          },
        ],
      },

      // کش طولانی‌مدت برای assetهای استاتیک Next.js
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },

      // کش هفتگی با stale-while-revalidate برای image optimizer
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: `public, max-age=${ONE_WEEK_IN_SECONDS}, stale-while-revalidate=86400`,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
