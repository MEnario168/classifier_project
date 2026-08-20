import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@tensorflow/tfjs"],
};

export default nextConfig;
