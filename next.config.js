// @ts-check
/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** One week in seconds */
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

/** Two years in seconds (for HSTS) */
const TWO_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 2;

/** Allowed hosts for remote images */
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
 * Content Security Policy (enforcing mode).
 *
 * connect-src / img-src are allowlisted to the exact third-party origins the
 * app actually talks to at runtime:
 *   - Resend (transactional email)
 *   - OpenAI / OpenRouter (AI features)
 *   - Upstash Redis REST (rate limiting, if configured)
 *   - Blockstream (BTC), Blockchair (DOGE), TronGrid (USDT-TRC20)
 *   - Vercel Blob (uploads)
 *   - Google / GitHub avatars
 *
 * script-src still needs 'unsafe-inline' + 'unsafe-eval' until nonce-based
 * script loading is wired. frame-ancestors, base-uri, object-src are
 * fail-closed from day one.
 */
const CSP_ENFORCE = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  [
    "img-src 'self' data: blob:",
    "https://lh3.googleusercontent.com",
    "https://avatars.githubusercontent.com",
    "https://public.blob.vercel-storage.com",
    "https://*.public.blob.vercel-storage.com",
    "https://images.unsplash.com",
    "https://remoteok.com",
    "https://www.arbeitnow.com",
  ].join(" "),
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://api.resend.com",
    "https://api.openai.com",
    "https://openrouter.ai",
    "https://*.upstash.io",
    "https://blockstream.info",
    "https://api.blockchair.com",
    "https://api.trongrid.io",
    "https://public.blob.vercel-storage.com",
    "https://*.public.blob.vercel-storage.com",
  ].join(" "),
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
// Next.js config
// ---------------------------------------------------------------------------

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  eslint: {
    // Lint errors fail the production build (ESLint build gate).
    ignoreDuringBuilds: false,
  },

  typescript: {
    // Type errors must fail the build.
    ignoreBuildErrors: false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: REMOTE_IMAGE_PATTERNS,
    minimumCacheTTL: ONE_WEEK_IN_SECONDS,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      // Global security headers
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

      // Long-term cache for Next.js static assets
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },

      // Weekly cache with stale-while-revalidate for image optimizer
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
