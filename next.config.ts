import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ['next-auth', '@auth/core'],
  serverExternalPackages: ['tesseract.js'],
  typedRoutes: false,
  outputFileTracingIncludes: {
    '/api/transactions/ocr-scan': [
      './node_modules/tesseract.js/**/*',
      './node_modules/tesseract.js-core/**/*',
      './node_modules/wasm-feature-detect/**/*',
      './node_modules/regenerator-runtime/**/*',
      './node_modules/is-url/**/*',
      './node_modules/node-fetch/**/*',
      './node_modules/bmp-js/**/*',
    ],
  },
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
