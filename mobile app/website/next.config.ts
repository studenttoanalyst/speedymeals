import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', 'motion'],
  },
};

export default nextConfig;
