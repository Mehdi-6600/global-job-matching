/** @type {import('next').NextConfig} */
const nextConfig = {
  // Smaller client bundles for icon-heavy pages
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Prefer modern image formats when next/image is used
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    minimumCacheTTL: 60 * 60 * 24,
  },

  // Gzip/brotli handled by Vercel; keep compress on for local/self-host
  compress: true,

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      // Long cache for hashed static assets
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
