import type { NextConfig } from 'next';

/**
 * Static export so the same build runs on Vercel, any static host and inside
 * Capacitor (Android / iOS) without a Node server.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: ['@muchiri/shared'],
  devIndicators: false,
};

export default nextConfig;
