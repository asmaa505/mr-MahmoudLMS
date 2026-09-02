import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // For ease of handling local image uploads
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
  }
};

export default nextConfig;
