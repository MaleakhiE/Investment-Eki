import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ['next-auth', '@auth/core'],
  typedRoutes: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [{
      source: '/reset-password',
      headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
    }];
  },
};

export default nextConfig;
