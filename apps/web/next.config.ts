import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the shared TypeScript package (it ships raw .ts source).
  transpilePackages: ["@rubies/shared"],
};

export default nextConfig;
