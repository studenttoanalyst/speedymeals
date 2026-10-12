import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' } : {}),
  images: {
    // Allow quality=20 for the blurred backdrop layer in HeroBannerCarousel
    qualities: [20, 75],
  },
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', 'motion'],
  },
};

export default nextConfig;
