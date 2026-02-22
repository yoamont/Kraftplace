import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.mellowparis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.shopify.com', pathname: '/**' },
    ],
  },
  // Vide pour autoriser une config webpack personnalisée (Next 16 utilise Turbopack par défaut)
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Désactive Trusted Types pour éviter l'erreur "Function constructor does not accept TrustedString arguments"
    if (!isServer && config.output) {
      config.output.trustedTypes = false;
    }
    return config;
  },
};

export default nextConfig;
