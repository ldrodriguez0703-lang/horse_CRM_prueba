import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "horse-inmotion.com",
      },
    ],
  },
};

export default nextConfig;
