import type { NextConfig } from "next";

/**
 * Redirection www → non-www (301) : voir middleware.ts
 */
const nextConfig: NextConfig = {
  /* NB : SUPABASE_SERVICE_ROLE_KEY est accessible via process.env dans les API routes serveur.
     Ne PAS l exposer ici (env: {}) car cela la rendrait accessible cote client. */
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.mellowparis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.shopify.com', pathname: '/**' },
      { protocol: 'https', hostname: 'krbphncxtettlslhkiqa.supabase.co', pathname: '/storage/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
  turbopack: {},
};

export default nextConfig;
